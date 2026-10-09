import { act, fireEvent, renderHook } from '@testing-library/react';
import { idleActivityKey, idleMemeKey, readIdleMemeProgress, saveIdleMemeProgress } from '../idleMeme';
import { useAssistantIdleMeme } from './useAssistantIdleMeme';

const minute = 60_000;
const start = Date.parse('2026-10-09T08:00:00Z');
const advance = async (ms: number) => {
	await act(async () => {
		await jest.advanceTimersByTimeAsync(ms);
	});
};
const options = () => ({
	enabled: true,
	userId: 42,
	blocked: false,
	onIdleAction: jest.fn(),
	verifyEligibilityAction: jest.fn().mockResolvedValue(true),
});

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(start);
	localStorage.clear();
});
afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

it('opens video one once, then video two once, and never starts a third sequence', async () => {
	const props = options();
	const { result, unmount } = renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute - 1);
	expect(result.current.video).toBeNull();
	await advance(1);
	expect(result.current.video).toBe(0);
	expect(result.current.canDisable).toBe(false);
	act(() => result.current.disable());
	expect(readIdleMemeProgress(42).disabled).toBe(false);
	act(() => result.current.dismiss());
	await advance(15 * minute);
	expect(result.current.video).toBe(1);
	expect(result.current.canDisable).toBe(true);
	act(() => result.current.dismiss());
	await advance(60 * minute);
	expect(props.onIdleAction).toHaveBeenCalledTimes(2);
	expect(props.verifyEligibilityAction).toHaveBeenCalledTimes(2);
	expect(result.current.video).toBeNull();
	unmount();
	const restored = renderHook(() => useAssistantIdleMeme(props));
	await advance(24 * 60 * minute);
	expect(restored.result.current.video).toBeNull();
	expect(props.onIdleAction).toHaveBeenCalledTimes(2);
});

it.each(['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'])('resets inactivity on %s', async (event) => {
	const { result } = renderHook(() => useAssistantIdleMeme(options()));
	await advance(14 * minute);
	fireEvent(window, new Event(event));
	await advance(14 * minute);
	expect(result.current.video).toBeNull();
	await advance(minute);
	expect(result.current.video).toBe(0);
});

it('counts inactivity while the tab is hidden; switching focus does not reset it', async () => {
	const { result } = renderHook(() => useAssistantIdleMeme(options()));
	await advance(10 * minute);
	jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
	fireEvent(document, new Event('visibilitychange'));
	await advance(4 * minute);
	fireEvent(window, new Event('focus'));
	await advance(minute);
	expect(result.current.video).toBe(0);
});

it('excludes the whole lunch hour and resumes the remaining minutes at 14:00', async () => {
	jest.setSystemTime(Date.parse('2026-10-09T11:55:00Z'));
	const { result } = renderHook(() => useAssistantIdleMeme(options()));
	await advance(65 * minute);
	expect(result.current.video).toBeNull();
	await advance(10 * minute);
	expect(result.current.video).toBe(0);
});

it('stops an existing player at lunch and never replays that video afterwards', async () => {
	jest.setSystemTime(Date.parse('2026-10-09T11:40:00Z'));
	const props = options();
	const { result } = renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute);
	expect(result.current.video).toBe(0);
	await advance(5 * minute);
	expect(result.current.video).toBeNull();
	await advance(70 * minute);
	expect(result.current.video).toBe(1);
	expect(props.onIdleAction).toHaveBeenCalledTimes(2);
});

it('starts counting at 14:00 after interaction during lunch', async () => {
	jest.setSystemTime(Date.parse('2026-10-09T11:55:00Z'));
	const { result } = renderHook(() => useAssistantIdleMeme(options()));
	await advance(35 * minute);
	fireEvent.keyDown(window, { key: 'a' });
	await advance(44 * minute);
	expect(result.current.video).toBeNull();
	await advance(minute);
	expect(result.current.video).toBe(0);
});

it('persists the disable choice only after video two', async () => {
	const { result } = renderHook(() => useAssistantIdleMeme(options()));
	await advance(30 * minute);
	expect(result.current.canDisable).toBe(true);
	act(() => result.current.disable());
	expect(result.current.canDisable).toBe(false);
	expect(result.current.video).toBeNull();
	expect(readIdleMemeProgress(42)).toEqual({ shown: 2, disabled: true, lastShownAt: start + 30 * minute });
});

it('resumes with only the second video after remount, without replaying the first', async () => {
	const props = options();
	const first = renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute);
	first.unmount();
	const second = renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute);
	expect(second.result.current.video).toBe(1);
	expect(props.onIdleAction).toHaveBeenCalledTimes(2);
});

it.each([{ enabled: false }, { userId: undefined }])('does nothing without eligibility %j', async (override) => {
	const props = { ...options(), ...override };
	const { result } = renderHook(() => useAssistantIdleMeme(props));
	await advance(60 * minute);
	expect(result.current.video).toBeNull();
	expect(props.verifyEligibilityAction).not.toHaveBeenCalled();
});

it('waits until the assistant is no longer busy', async () => {
	const props = { ...options(), blocked: true };
	const { result, rerender } = renderHook((value) => useAssistantIdleMeme(value), { initialProps: props });
	await advance(15 * minute);
	expect(result.current.video).toBeNull();
	rerender({ ...props, blocked: false });
	await advance(1000);
	expect(result.current.video).toBe(0);
});

it.each(['denied', 'offline'])('silently skips the meme if the fresh server check is %s', async (reason) => {
	const props = options();
	if (reason === 'denied') props.verifyEligibilityAction.mockResolvedValue(false);
	else props.verifyEligibilityAction.mockRejectedValue(new Error('offline'));
	const { result } = renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute);
	expect(result.current.video).toBeNull();
	expect(readIdleMemeProgress(42).shown).toBe(0);
});

it('does not show after logout while eligibility is being checked', async () => {
	const props = options();
	let resolve!: (value: boolean) => void;
	props.verifyEligibilityAction.mockImplementation(
		() =>
			new Promise<boolean>((done) => {
				resolve = done;
			}),
	);
	const { unmount } = renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute);
	unmount();
	await act(async () => resolve(true));
	expect(props.onIdleAction).not.toHaveBeenCalled();
	expect(readIdleMemeProgress(42).shown).toBe(0);
});

it('respects activity and completion in another tab', async () => {
	const props = options();
	const { result } = renderHook(() => useAssistantIdleMeme(props));
	await advance(14 * minute);
	localStorage.setItem(idleActivityKey(42), String(Date.now()));
	fireEvent(window, new StorageEvent('storage', { key: idleActivityKey(42) }));
	await advance(minute);
	expect(result.current.video).toBeNull();
	saveIdleMemeProgress(42, { shown: 2, disabled: false, lastShownAt: Date.now() });
	fireEvent(window, new StorageEvent('storage', { key: idleMemeKey(42) }));
	await advance(30 * minute);
	expect(props.onIdleAction).not.toHaveBeenCalled();
});

it('does not display anything if completion cannot be persisted', async () => {
	jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new Error('unavailable');
	});
	const props = options();
	renderHook(() => useAssistantIdleMeme(props));
	await advance(15 * minute);
	expect(props.onIdleAction).not.toHaveBeenCalled();
});

it('claims a video only once when two app instances reach the deadline together', async () => {
	let held = false;
	const request = jest.fn(async (_name, _options, callback) => {
		if (held) return callback(null);
		held = true;
		try {
			return await callback({ name: idleMemeKey(42) });
		} finally {
			held = false;
		}
	});
	Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
	try {
		const firstProps = options(),
			secondProps = options();
		const first = renderHook(() => useAssistantIdleMeme(firstProps));
		const second = renderHook(() => useAssistantIdleMeme(secondProps));
		await advance(15 * minute);
		expect(request).toHaveBeenCalled();
		expect([first.result.current.video, second.result.current.video].filter((value) => value === 0)).toHaveLength(1);
		expect(readIdleMemeProgress(42).shown).toBe(1);
		await advance(minute);
		expect(firstProps.onIdleAction.mock.calls.length + secondProps.onIdleAction.mock.calls.length).toBe(1);
		first.unmount();
		second.unmount();
	} finally {
		Reflect.deleteProperty(navigator, 'locks');
	}
});
