'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { subscribeWorkflowSocket } from '@/store/services/ws';
import type { NotificationItem } from '@/types/designWorkflowTypes';
import type {
	DesktopNotice,
	DesktopNotificationPermission,
	DesktopNotificationPreferences,
} from '@/types/desktopNotificationTypes';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import { DASHBOARD_NOTIFICATIONS } from '@/utils/routes';
import {
	deliverDesktopNotice,
	desktopPreferencesKey,
	noticeFromChatEvent,
	noticeFromNotification,
	readDesktopPreferences,
	saveDesktopPreferences,
	socketNotificationEvent,
} from '@/utils/workflow/desktopNotifications';

const getPermission = (): DesktopNotificationPermission =>
	typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window
		? Notification.permission
		: 'unsupported';

export const useDesktopNotifications = ({
	userId,
	notifications,
	copy,
	language,
	onNavigateAction,
}: {
	userId: number | null;
	notifications: NotificationItem[] | undefined;
	copy: WorkflowCopy;
	language: string;
	onNavigateAction: (href: string) => void;
}) => {
	const [permission, setPermission] = useState<DesktopNotificationPermission>('unsupported');
	const [preferences, setPreferences] = useState<DesktopNotificationPreferences>({ enabled: true, sound: true });
	const [requesting, setRequesting] = useState(false);
	const [failed, setFailed] = useState(false);
	const lifecycle = useRef({ userId, active: false });
	const baseline = useRef(false);
	const seenIds = useRef(new Set<number>());
	const deliveredKeys = useRef(new Set<string>());
	const pendingIds = useRef(new Set<number>());

	useEffect(() => {
		const current = { userId, active: true };
		lifecycle.current = current;
		baseline.current = false;
		seenIds.current.clear();
		deliveredKeys.current.clear();
		pendingIds.current.clear();
		setFailed(false);
		setRequesting(false);
		const sync = () => {
			setPermission(getPermission());
			if (userId) setPreferences(readDesktopPreferences(userId));
		};
		const storageChanged = (event: StorageEvent) => {
			if (event.key === null || event.key === desktopPreferencesKey(userId ?? 0)) sync();
		};
		sync();
		window.addEventListener('focus', sync);
		window.addEventListener('storage', storageChanged);
		return () => {
			current.active = false;
			window.removeEventListener('focus', sync);
			window.removeEventListener('storage', storageChanged);
		};
	}, [userId]);

	const show = async (notice: DesktopNotice) => {
		const current = lifecycle.current;
		if (!userId || !current.active || current.userId !== userId) return;
		try {
			await deliverDesktopNotice(
				userId,
				notice,
				preferences,
				language,
				onNavigateAction,
				() => current.active && readDesktopPreferences(userId).enabled,
			);
		} catch {
			if (current.active) setFailed(true);
		}
	};
	const receiveNotice = useEffectEvent((notice: DesktopNotice) => {
		if (deliveredKeys.current.has(notice.key)) return;
		deliveredKeys.current.add(notice.key);
		void show(notice);
	});
	const receiveSocketEvent = useEffectEvent((payload: unknown) => {
		if (!userId) return;
		const event = socketNotificationEvent(payload);
		if (event?.type === 'NOTIFICATION' && event.event === 'new' && typeof event.notification_id === 'number') {
			pendingIds.current.add(event.notification_id);
		}
		const notice = noticeFromChatEvent(payload, userId, copy);
		if (notice) receiveNotice(notice);
	});
	useEffect(() => {
		if (!userId) return;
		return subscribeWorkflowSocket((payload) => receiveSocketEvent(payload));
	}, [userId]);

	const receiveNotifications = useEffectEvent((items: NotificationItem[]) => {
		for (const item of items) {
			const fresh = !seenIds.current.has(item.id) && (baseline.current || pendingIds.current.has(item.id));
			seenIds.current.add(item.id);
			pendingIds.current.delete(item.id);
			if (fresh && !item.is_read && (!item.snoozed_until || Date.parse(item.snoozed_until) <= Date.now())) {
				receiveNotice(noticeFromNotification(item, copy));
			}
		}
		baseline.current = true;
	});
	useEffect(() => {
		if (userId && notifications) receiveNotifications(notifications);
	}, [userId, notifications]);

	const updatePreferences = (patch: Partial<DesktopNotificationPreferences>) => {
		const next = { ...preferences, ...patch };
		setPreferences(next);
		if (userId) saveDesktopPreferences(userId, next);
	};
	const enable = async () => {
		if (!userId || requesting || getPermission() === 'unsupported') return;
		const current = lifecycle.current;
		setRequesting(true);
		setFailed(false);
		try {
			// Must run directly from the user's click, never from a mount effect.
			const result = getPermission() === 'default' ? await Notification.requestPermission() : Notification.permission;
			if (!current.active) return;
			setPermission(result);
			if (result === 'granted') updatePreferences({ enabled: true });
		} catch {
			if (current.active) setFailed(true);
		} finally {
			if (current.active) setRequesting(false);
		}
	};
	return {
		permission,
		enabled: permission === 'granted' && preferences.enabled,
		sound: preferences.sound,
		requesting,
		failed,
		enable,
		disable: () => updatePreferences({ enabled: false }),
		setSound: (sound: boolean) => updatePreferences({ sound }),
		test: () => {
			setFailed(false);
			void show({
				key: `test:${Date.now()}`,
				title: copy.labels.desktopTitle,
				body: copy.labels.desktopTestBody,
				href: DASHBOARD_NOTIFICATIONS,
			});
		},
	};
};
