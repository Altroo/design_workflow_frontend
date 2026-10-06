import { act, renderHook, waitFor } from '@testing-library/react';
import { en } from '@/translations/en';
import type { NotificationItem } from '@/types/designWorkflowTypes';
import { useDesktopNotifications } from './useDesktopNotifications';

const mockListeners = new Set<(payload: unknown) => void>();
jest.mock('@/store/services/ws', () => ({
	subscribeWorkflowSocket: (listener: (payload: unknown) => void) => {
		mockListeners.add(listener);
		return () => mockListeners.delete(listener);
	},
}));
const mockNative = jest.fn();
const mockRequest = jest.fn();
let permission: NotificationPermission;
const item = (id: number, patch: Partial<NotificationItem> = {}): NotificationItem => ({
	id,
	type: 'task_overdue',
	task: null,
	project: null,
	payload: { title: `Task ${id}` },
	is_read: false,
	read_at: null,
	snoozed_until: null,
	action_taken_at: null,
	created_at: '2026-10-06T09:00:00Z',
	...patch,
});
const props = (notifications: NotificationItem[] | undefined = []) => ({
	userId: 1 as number | null,
	notifications,
	copy: en.workflow,
	language: 'en',
	onNavigateAction: jest.fn(),
});
const emit = (event: unknown) => act(() => mockListeners.forEach((listener) => listener(event)));
const chat = (id = 55, senderId = 2) => ({
	type: 'chat_message',
	message: { id, thread: 7, sender: { id: senderId, first_name: 'Maryam', last_name: 'A' }, body: 'Hello' },
});

beforeEach(() => {
	localStorage.clear();
	mockListeners.clear();
	mockNative.mockReset().mockImplementation(() => ({ close: jest.fn() }));
	mockRequest.mockReset().mockImplementation(async () => {
		permission = 'granted';
		return permission;
	});
	permission = 'granted';
	Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
	Object.defineProperty(window, 'Notification', { configurable: true, value: mockNative });
	Object.defineProperties(mockNative, {
		permission: { configurable: true, get: () => permission },
		requestPermission: { configurable: true, value: mockRequest },
	});
	Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
});
afterEach(() => jest.restoreAllMocks());

it('does not replay the initial unread backlog and delivers every new notification while visible', async () => {
	const { rerender } = renderHook(useDesktopNotifications, { initialProps: props([item(1)]) });
	expect(mockNative).not.toHaveBeenCalled();
	expect(mockRequest).not.toHaveBeenCalled();
	rerender(props([item(1), item(2), item(3), item(4), item(5)]));
	await waitFor(() => expect(mockNative).toHaveBeenCalledTimes(4));
	rerender(props([item(2), item(3)]));
	rerender(props([item(1), item(2), item(3)]));
	expect(mockNative).toHaveBeenCalledTimes(4);
});

it('handles a socket notification arriving before the first unread query and skips old/read/snoozed alerts', async () => {
	const { rerender } = renderHook(useDesktopNotifications, {
		initialProps: { ...props(), notifications: undefined as NotificationItem[] | undefined },
	});
	emit({ message: { type: 'NOTIFICATION', event: 'new', notification_id: 9 } });
	rerender(props([item(9), item(6), item(8, { is_read: true }), item(7, { snoozed_until: '2099-01-01' })]));
	await waitFor(() => expect(mockNative).toHaveBeenCalledTimes(1));
});

it('delivers public/private chat immediately, deduplicates its notification rows and ignores own/updated messages', async () => {
	const { rerender } = renderHook(useDesktopNotifications, { initialProps: props() });
	emit(chat());
	emit({ message: chat() });
	emit(chat(56, 1));
	emit({ ...chat(57), type: 'chat_updated' });
	rerender(
		props([
			item(1, { type: 'chat_message', payload: { message_id: 55, thread_id: 7 } }),
			item(2, { type: 'chat_message', payload: { message_id: 55, thread_id: 7 } }),
		]),
	);
	await waitFor(() => expect(mockNative).toHaveBeenCalledTimes(1));
	expect(mockNative).toHaveBeenCalledWith('Maryam A', expect.objectContaining({ body: 'Hello' }));
});

it('requests permission only on enable, does not replay messages received while disabled and supports sound/test', async () => {
	permission = 'default';
	const { result, rerender } = renderHook(useDesktopNotifications, { initialProps: props() });
	expect(mockRequest).not.toHaveBeenCalled();
	emit(chat());
	expect(mockNative).not.toHaveBeenCalled();
	await act(() => result.current.enable());
	expect(mockRequest).toHaveBeenCalledTimes(1);
	expect(result.current.enabled).toBe(true);
	rerender(props([item(1, { type: 'chat_message', payload: { message_id: 55, thread_id: 7 } })]));
	expect(mockNative).not.toHaveBeenCalled();
	act(() => result.current.setSound(false));
	act(() => result.current.test());
	await waitFor(() =>
		expect(mockNative).toHaveBeenCalledWith(en.workflow.labels.desktopTitle, expect.objectContaining({ silent: true })),
	);
	act(() => result.current.disable());
	emit(chat(58));
	expect(mockNative).toHaveBeenCalledTimes(1);
	await act(() => result.current.enable());
	emit(chat(58));
	emit(chat(59));
	await waitFor(() => expect(mockNative).toHaveBeenCalledTimes(2));
});

it('keeps blocked/unsupported browsers safe and reports permission errors', async () => {
	permission = 'denied';
	const { result } = renderHook(useDesktopNotifications, { initialProps: props() });
	await act(() => result.current.enable());
	expect(mockRequest).not.toHaveBeenCalled();
	expect(result.current.enabled).toBe(false);
	permission = 'default';
	mockRequest.mockRejectedValueOnce(new Error('blocked'));
	await act(() => result.current.enable());
	expect(result.current.failed).toBe(true);
	Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
	act(() => window.dispatchEvent(new Event('focus')));
	expect(result.current.permission).toBe('unsupported');
	await act(() => result.current.enable());
	expect(mockRequest).toHaveBeenCalledTimes(1);
});

it('syncs settings across tabs, catches unsupported constructors and cleans up the socket subscription', async () => {
	const { result, unmount } = renderHook(useDesktopNotifications, { initialProps: props() });
	localStorage.setItem('workflow:desktop:1:preferences', JSON.stringify({ enabled: false, sound: false }));
	act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'workflow:desktop:1:preferences' })));
	expect(result.current.enabled).toBe(false);
	expect(result.current.sound).toBe(false);
	await act(() => result.current.enable());
	mockNative.mockImplementationOnce(() => {
		throw new Error('mobile');
	});
	emit(chat());
	await waitFor(() => expect(result.current.failed).toBe(true));
	unmount();
	expect(mockListeners.size).toBe(0);
});

it('does not leak queued notifications or navigation across account changes', async () => {
	let release: (() => boolean) | undefined;
	Object.defineProperty(navigator, 'locks', {
		configurable: true,
		value: {
			request: (_: string, callback: () => boolean) =>
				new Promise<boolean>((resolve) => {
					release = () => {
						const value = callback();
						resolve(value);
						return value;
					};
				}),
		},
	});
	const { rerender } = renderHook(useDesktopNotifications, { initialProps: props() });
	emit(chat());
	rerender({ ...props(), userId: null });
	await act(async () => {
		release?.();
	});
	expect(mockNative).not.toHaveBeenCalled();
	expect(mockListeners.size).toBe(0);
});

it('deduplicates the same event in two mounted tabs', async () => {
	renderHook(useDesktopNotifications, { initialProps: props() });
	renderHook(useDesktopNotifications, { initialProps: props() });
	emit(chat());
	await waitFor(() => expect(mockNative).toHaveBeenCalledTimes(1));
});
