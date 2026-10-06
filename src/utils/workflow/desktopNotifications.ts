import type { NotificationItem } from '@/types/designWorkflowTypes';
import type { DesktopNotice, DesktopNotificationPreferences } from '@/types/desktopNotificationTypes';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import { DASHBOARD_CHAT, DASHBOARD_NOTIFICATIONS, DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const positiveId = (value: unknown) => {
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
};
const chatHref = (thread: number, message: number | null) =>
	`${DASHBOARD_CHAT}?thread=${thread}${message ? `&message=${message}` : ''}`;

export const desktopPreferencesKey = (userId: number) => `workflow:desktop:${userId}:preferences`;

export const readDesktopPreferences = (userId: number): DesktopNotificationPreferences => {
	try {
		const value: unknown = JSON.parse(localStorage.getItem(desktopPreferencesKey(userId)) ?? 'null');
		if (isRecord(value)) return { enabled: value.enabled !== false, sound: value.sound !== false };
	} catch {
		// Storage may be disabled by the browser. In-memory controls still work.
	}
	return { enabled: true, sound: true };
};

export const saveDesktopPreferences = (userId: number, preferences: DesktopNotificationPreferences) => {
	try {
		localStorage.setItem(desktopPreferencesKey(userId), JSON.stringify(preferences));
	} catch {
		// Do not break notifications if storage is unavailable.
	}
};

export const noticeFromNotification = (item: NotificationItem, copy: WorkflowCopy): DesktopNotice => {
	const threadId = positiveId(item.payload.thread_id);
	const messageId = positiveId(item.payload.message_id);
	const chat = item.type === 'chat_message';
	return {
		key: chat && messageId ? `chat:${messageId}` : `notification:${item.id}`,
		title: copy.activities[item.type] ?? copy.labels.notificationFallback,
		body: [
			item.task?.title ?? item.project?.name,
			typeof item.payload.title === 'string' ? item.payload.title : '',
			typeof item.payload.note === 'string' ? item.payload.note : '',
		]
			.filter(Boolean)
			.join(' — '),
		href:
			chat && threadId
				? chatHref(threadId, messageId)
				: item.task
					? DASHBOARD_TASK_VIEW(item.task.id)
					: item.project
						? DASHBOARD_PROJECT_VIEW(item.project.id)
						: DASHBOARD_NOTIFICATIONS,
	};
};

export const socketNotificationEvent = (payload: unknown) => {
	if (!isRecord(payload)) return null;
	return isRecord(payload.message) && typeof payload.message.type === 'string' ? payload.message : payload;
};

export const noticeFromChatEvent = (payload: unknown, userId: number, copy: WorkflowCopy): DesktopNotice | null => {
	const event = socketNotificationEvent(payload);
	if (!event || !['chat.message', 'chat_message'].includes(String(event.type))) return null;
	const message = event.message;
	if (!isRecord(message) || !isRecord(message.sender) || message.is_deleted || message.deleted_at) return null;
	const senderId = positiveId(message.sender.id);
	const id = positiveId(message.id);
	const threadId = positiveId(message.thread);
	if (!id || !threadId || !senderId || senderId === userId) return null;
	const name = [message.sender.first_name, message.sender.last_name]
		.filter((part) => typeof part === 'string' && part.trim())
		.join(' ');
	const body =
		typeof message.body === 'string' && message.body.trim() ? message.body.trim() : copy.labels.desktopAttachment;
	return {
		key: `chat:${id}`,
		title: name || copy.activities.chat_message,
		body,
		href: chatHref(threadId, id),
	};
};

// IDs only: never persist message contents. The lock prevents multiple app tabs
// from alerting for the same socket event / notification-query result.
export const deliverDesktopNotice = async (
	userId: number,
	notice: DesktopNotice,
	preferences: DesktopNotificationPreferences,
	language: string,
	onNavigate: (href: string) => void,
	isActive: () => boolean,
): Promise<boolean> => {
	const deliver = () => {
		if (!isActive() || !preferences.enabled || !('Notification' in window) || Notification.permission !== 'granted')
			return false;
		const ledgerKey = `workflow:desktop:${userId}:delivered`;
		let ledger: Record<string, number> = {};
		try {
			const value: unknown = JSON.parse(localStorage.getItem(ledgerKey) ?? '{}');
			if (isRecord(value))
				ledger = Object.fromEntries(
					Object.entries(value).filter(
						(entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > Date.now() - 86_400_000,
					),
				);
		} catch {
			/* The OS tag also groups duplicates if storage is blocked. */
		}
		if (ledger[notice.key]) return false;
		const notification = new Notification(notice.title.slice(0, 150), {
			body: notice.body.slice(0, 300),
			tag: `workflow:${userId}:${notice.key}`,
			icon: '/assets/ico/android-icon-192x192.png',
			lang: language,
			silent: !preferences.sound,
		});
		notification.onclick = () => {
			notification.close();
			if (!isActive()) return;
			window.focus();
			onNavigate(notice.href);
		};
		ledger[notice.key] = Date.now();
		try {
			localStorage.setItem(ledgerKey, JSON.stringify(Object.fromEntries(Object.entries(ledger).slice(-500))));
		} catch {
			/* Private browsing / full storage must not break delivery. */
		}
		return true;
	};
	return navigator.locks ? navigator.locks.request(`workflow:desktop:${userId}`, deliver) : deliver();
};
