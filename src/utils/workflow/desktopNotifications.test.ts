import { en } from '@/translations/en';
import type { NotificationItem } from '@/types/designWorkflowTypes';
import {
	deliverDesktopNotice,
	noticeFromChatEvent,
	noticeFromNotification,
	readDesktopPreferences,
	saveDesktopPreferences,
	socketNotificationEvent,
} from './desktopNotifications';

const notification = {
	id: 1,
	type: 'task_overdue',
	payload: {},
	task: { id: 7, title: 'Design' },
	project: null,
} as NotificationItem;
const chatEvent = {
	type: 'chat_message',
	message: { id: 12, thread: 3, sender: { id: 2, first_name: 'Maryam', last_name: 'A' }, body: 'Ready for review' },
};
const mockNotification = jest.fn();
const mockClose = jest.fn();
let permission: NotificationPermission = 'granted';
let click: (() => void) | undefined;
beforeEach(() => {
	localStorage.clear();
	permission = 'granted';
	jest.clearAllMocks();
	Object.defineProperty(window, 'Notification', {
		configurable: true,
		value: mockNotification,
	});
	Object.defineProperty(mockNotification, 'permission', { configurable: true, get: () => permission });
	mockNotification.mockImplementation(() => ({
		close: mockClose,
		set onclick(value: () => void) {
			click = value;
		},
	}));
	jest.spyOn(window, 'focus').mockImplementation(() => {});
	Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
});
afterEach(() => jest.restoreAllMocks());

it('maps all notification kinds to readable content and correct internal destinations', () => {
	expect(noticeFromNotification(notification, en.workflow)).toEqual(
		expect.objectContaining({ key: 'notification:1', body: 'Design', href: expect.stringContaining('/tasks/7') }),
	);
	expect(
		noticeFromNotification(
			{ ...notification, task: null, project: { id: 4, name: 'Studio' } } as NotificationItem,
			en.workflow,
		).href,
	).toContain('/projects/4');
	expect(
		noticeFromNotification(
			{ ...notification, task: null, type: 'future_event', payload: { note: 'Reminder' } },
			en.workflow,
		),
	).toEqual(
		expect.objectContaining({
			title: en.workflow.labels.notificationFallback,
			body: 'Reminder',
			href: expect.stringContaining('/notifications'),
		}),
	);
	expect(
		noticeFromNotification(
			{ ...notification, type: 'chat_message', payload: { thread_id: 3, message_id: 12 } },
			en.workflow,
		),
	).toEqual(expect.objectContaining({ key: 'chat:12', href: expect.stringContaining('/chat?thread=3&message=12') }));
	expect(
		noticeFromNotification(
			{ ...notification, task: null, payload: { thread_id: 'javascript:bad' }, type: 'chat_message' },
			en.workflow,
		).href,
	).toContain('/notifications');
});

it('parses direct and wrapped chat events including public chats, attachments and excludes own messages / edits', () => {
	expect(noticeFromChatEvent(chatEvent, 1, en.workflow)).toEqual({
		key: 'chat:12',
		title: 'Maryam A',
		body: 'Ready for review',
		href: expect.stringContaining('/chat?thread=3&message=12'),
	});
	expect(noticeFromChatEvent({ message: { ...chatEvent, type: 'chat.message' } }, 1, en.workflow)?.key).toBe('chat:12');
	expect(noticeFromChatEvent({ ...chatEvent, message: { ...chatEvent.message, body: '' } }, 1, en.workflow)?.body).toBe(
		en.workflow.labels.desktopAttachment,
	);
	expect(noticeFromChatEvent(chatEvent, 2, en.workflow)).toBeNull();
	for (const payload of [
		null,
		{ type: 'chat_read' },
		{ ...chatEvent, type: 'chat.updated' },
		{ ...chatEvent, message: { ...chatEvent.message, is_deleted: true } },
		{ ...chatEvent, message: { id: 3 } },
	]) {
		expect(noticeFromChatEvent(payload, 1, en.workflow)).toBeNull();
	}
	expect(socketNotificationEvent({ message: { type: 'NOTIFICATION', event: 'new' } })?.event).toBe('new');
});

it('persists preferences per account and tolerates invalid or unavailable storage', () => {
	expect(readDesktopPreferences(1)).toEqual({ enabled: true, sound: true });
	saveDesktopPreferences(1, { enabled: false, sound: false });
	expect(readDesktopPreferences(1).sound).toBe(false);
	expect(readDesktopPreferences(2).sound).toBe(true);
	jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new Error('private');
	});
	jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new Error('private');
	});
	expect(() => saveDesktopPreferences(1, { enabled: true, sound: false })).not.toThrow();
	expect(readDesktopPreferences(1).enabled).toBe(true);
});

it('deduplicates query/socket/tab deliveries, passes native sound, and opens the destination on click', async () => {
	const navigate = jest.fn();
	const notice = noticeFromNotification(notification, en.workflow);
	const args = [1, notice, { enabled: true, sound: true }, 'fr', navigate, () => true] as const;
	expect(await deliverDesktopNotice(...args)).toBe(true);
	expect(await deliverDesktopNotice(...args)).toBe(false);
	expect(mockNotification).toHaveBeenCalledTimes(1);
	expect(mockNotification).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ silent: false, lang: 'fr', tag: 'workflow:1:notification:1' }),
	);
	click?.();
	expect(mockClose).toHaveBeenCalled();
	expect(window.focus).toHaveBeenCalled();
	expect(navigate).toHaveBeenCalledWith(notice.href);
	expect(await deliverDesktopNotice(2, notice, { enabled: true, sound: false }, 'en', navigate, () => true)).toBe(true);
	expect(mockNotification.mock.calls[1][1].silent).toBe(true);
});

it('serializes concurrent tabs with a Web Lock and skips disabled, denied and signed-out contexts', async () => {
	const request = jest.fn((_key: string, callback: () => boolean) => Promise.resolve(callback()));
	Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
	const notice = noticeFromNotification(notification, en.workflow);
	const send = (enabled = true, active = true) =>
		deliverDesktopNotice(1, notice, { enabled, sound: true }, 'en', jest.fn(), () => active);
	expect(await send(false)).toBe(false);
	expect(await send(true, false)).toBe(false);
	permission = 'denied';
	expect(await send()).toBe(false);
	expect(mockNotification).not.toHaveBeenCalled();
	permission = 'granted';
	expect(await Promise.all([send(), send()])).toEqual([true, false]);
	expect(request).toHaveBeenCalledWith('workflow:desktop:1', expect.any(Function));
});

it('does not navigate from a notification left over after logout and does not store failed delivery', async () => {
	let active = true;
	const navigate = jest.fn();
	const notice = noticeFromNotification(notification, en.workflow);
	await deliverDesktopNotice(1, notice, { enabled: true, sound: true }, 'en', navigate, () => active);
	active = false;
	click?.();
	expect(navigate).not.toHaveBeenCalled();
	mockNotification.mockImplementationOnce(() => {
		throw new Error('unsupported');
	});
	await expect(
		deliverDesktopNotice(2, notice, { enabled: true, sound: true }, 'en', navigate, () => true),
	).rejects.toThrow('unsupported');
	expect(localStorage.getItem('workflow:desktop:2:delivered')).toBeNull();
});
