import { eventChannel, runSaga, stdChannel } from 'redux-saga';
import { watchWS, workflowTagsForEvent } from './wsSaga';
import { designWorkflowApi } from '@/store/services/designWorkflow';
import { profilApi, usersApi } from '@/store/services/account';
import { initWebsocket } from '@/store/services/ws';
import { getAccessToken } from '@/store/selectors';
import type { Action } from 'redux';
import * as Types from '@/store/actions';
import { setWSMaintenance, setWSOnlineUsers } from '@/store/slices/wsSlice';
import { getSession } from 'next-auth/react';

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));

jest.mock('@/store/services/ws', () => ({
	initWebsocket: jest.fn(),
}));

jest.mock('@/store/selectors', () => ({
	getAccessToken: jest.fn(),
}));

jest.mock('@/store/sagas/_initSaga', () => ({
	initMaintenanceSaga: jest.fn(function* () {}),
}));

import { initMaintenanceSaga } from '@/store/sagas/_initSaga';

describe('watchWS saga', () => {
	it('reads the latest session token for reconnects and returns null after logout', async () => {
		jest.mocked(getAccessToken).mockReturnValue('initial-token');
		const channel = eventChannel<never>(() => () => {});
		jest.mocked(initWebsocket).mockReturnValue(channel);
		const task = runSaga({ getState: () => ({}), dispatch: jest.fn() }, watchWS);
		try {
			const getToken = jest.mocked(initWebsocket).mock.calls.at(-1)![0];
			jest
				.mocked(getSession)
				.mockResolvedValueOnce({ accessToken: 'rotated-token' } as Awaited<ReturnType<typeof getSession>>)
				.mockResolvedValueOnce(null);
			await expect(getToken()).resolves.toBe('rotated-token');
			await expect(getToken()).resolves.toBeNull();
		} finally {
			task.cancel();
			await task.toPromise();
		}
	});
	it('should initialize websocket and dispatch actions from the channel', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction: Action = { type: 'MOCK_ACTION' };

		(getAccessToken as jest.Mock).mockReturnValue(mockToken);

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10); // emit after saga starts
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const task = runSaga(
			{
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);

		// Cancel after short delay to break infinite loop
		setTimeout(() => task.cancel(), 100);

		await task.toPromise();

		expect(initWebsocket).toHaveBeenCalledWith(expect.any(Function));
		expect(dispatched).toContainEqual(mockAction);
	}, 10000);

	it('should call initMaintenanceSaga on WS_RECONNECTED', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction = { type: Types.WS_RECONNECTED };

		(getAccessToken as jest.Mock).mockReturnValue(mockToken);

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10);
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const task = runSaga(
			{
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);

		setTimeout(() => task.cancel(), 100);
		await task.toPromise();

		expect(initMaintenanceSaga).toHaveBeenCalled();
		expect(dispatched).toContainEqual(
			expect.objectContaining({
				type: designWorkflowApi.util.invalidateTags.type,
				payload: expect.arrayContaining([
					'Task',
					'Project',
					'Chat',
					'Label',
					'Search',
					'SavedView',
					'NotificationPreference',
				]),
			}),
		);
		expect(dispatched).toContainEqual(usersApi.util.invalidateTags(['Users']));
		expect(dispatched).toContainEqual(profilApi.util.invalidateTags(['Profil']));
	});

	it('should map WS_MAINTENANCE to setWSMaintenance', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction = { type: Types.WS_MAINTENANCE, maintenance: true };

		(getAccessToken as jest.Mock).mockReturnValue(mockToken);

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10);
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const task = runSaga(
			{
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);

		setTimeout(() => task.cancel(), 100);
		await task.toPromise();

		expect(initWebsocket).toHaveBeenCalledWith(expect.any(Function));
		expect(dispatched).toContainEqual(setWSMaintenance(true));
	});

	it('should map WS_USER_PRESENCE to setWSOnlineUsers', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction = { type: Types.WS_USER_PRESENCE, userId: 7, online: true, onlineUserIds: [4, 7] };

		(getAccessToken as jest.Mock).mockReturnValue(mockToken);

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10);
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const task = runSaga(
			{
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);

		setTimeout(() => task.cancel(), 100);
		await task.toPromise();

		expect(dispatched).toContainEqual(setWSOnlineUsers([4, 7]));
	});
});

test.each([
	['TASK_EVENT', undefined, ['Task', 'Project', 'Dashboard', 'Report', 'Chat', 'Search']],
	['CHAT_EVENT', undefined, ['Chat', 'Search']],
	['NOTIFICATION', undefined, ['Notification']],
	['WORKFLOW_EVENT', 'labels', ['Label', 'Task']],
	['WORKFLOW_EVENT', 'views', ['SavedView']],
	['WORKFLOW_EVENT', 'notification-preferences', ['NotificationPreference']],
	['WORKFLOW_EVENT', 'users', ['Task', 'Project', 'Chat', 'Search']],
] as const)('invalidates %s %s subscribers', (channel, scope, expected) => {
	expect(workflowTagsForEvent({ type: Types.WS_DESIGN_WORKFLOW_INVALIDATE, channel, scope })).toEqual(
		expect.arrayContaining([...expected]),
	);
});

test('pending maintenance does not block events, logout cleanup, or login again', async () => {
	let token: string | null = 'first';
	(getAccessToken as jest.Mock).mockImplementation(() => token);
	(initMaintenanceSaga as jest.Mock).mockImplementation(function* () {
		yield new Promise(() => {});
	});
	const emitters: Array<(action: Action) => void> = [];
	const closed = jest.fn();
	(initWebsocket as jest.Mock).mockImplementation(() =>
		eventChannel<Action>((emit) => {
			emitters.push(emit);
			return closed;
		}),
	);
	const input = stdChannel<Action>();
	const dispatched: Action[] = [];
	const task = runSaga(
		{ channel: input, dispatch: (action: Action) => dispatched.push(action), getState: () => ({}) },
		watchWS,
	);
	try {
		emitters[0]({ type: Types.WS_RECONNECTED });
		emitters[0]({ type: 'AFTER_RECONNECT' });
		expect(dispatched).toContainEqual({ type: 'AFTER_RECONNECT' });
		token = null;
		input.put({ type: 'LOGGED_OUT' });
		expect(closed).toHaveBeenCalledTimes(1);
		token = 'second';
		input.put({ type: 'LOGGED_IN' });
		expect(emitters).toHaveLength(2);
		emitters[1]({ type: 'SECOND_SESSION_EVENT' });
		expect(dispatched).toContainEqual({ type: 'SECOND_SESSION_EVENT' });
	} finally {
		task.cancel();
		await task.toPromise();
	}
	expect(closed).toHaveBeenCalledTimes(2);
});

describe('visible workspace reconciliation', () => {
	let visible: jest.SpyInstance;
	let online: jest.SpyInstance;

	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		visible = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		online = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
		(getAccessToken as jest.Mock).mockReturnValue('signed-in');
		(initMaintenanceSaga as jest.Mock).mockImplementation(function* () {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
	});

	const start = () => {
		let emit!: (action: Action) => void;
		const close = jest.fn();
		const channel = eventChannel<Action>((next) => {
			emit = next;
			return close;
		});
		(initWebsocket as jest.Mock).mockReturnValue(channel);
		const input = stdChannel<Action>();
		const dispatched: Action[] = [];
		const task = runSaga(
			{ channel: input, dispatch: (action: Action) => dispatched.push(action), getState: () => ({}) },
			watchWS,
		);
		const workflowRefreshes = () =>
			dispatched.filter((action) => action.type === designWorkflowApi.util.invalidateTags.type);
		return { task, input, dispatched, emit, close, workflowRefreshes };
	};

	it('refreshes all workflow, account, and maintenance data once each minute when visible and online', async () => {
		const running = start();
		try {
			await jest.advanceTimersByTimeAsync(59_999);
			expect(running.dispatched).toHaveLength(0);
			await jest.advanceTimersByTimeAsync(1);
			expect(running.workflowRefreshes()).toHaveLength(1);
			expect(running.dispatched).toContainEqual(
				designWorkflowApi.util.invalidateTags([
					'Task',
					'Project',
					'Dashboard',
					'Workload',
					'Report',
					'Notification',
					'Chat',
					'Label',
					'SavedView',
					'NotificationPreference',
					'Search',
				]),
			);
			expect(running.dispatched).toContainEqual(usersApi.util.invalidateTags(['Users']));
			expect(running.dispatched).toContainEqual(profilApi.util.invalidateTags(['Profil']));
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(1);
			await jest.advanceTimersByTimeAsync(60_000);
			expect(running.workflowRefreshes()).toHaveLength(2);
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(2);
		} finally {
			running.task.cancel();
			await running.task.toPromise();
		}
	});

	it('skips hidden or offline tabs and resumes on the next eligible cycle', async () => {
		visible.mockReturnValue('hidden');
		const running = start();
		try {
			await jest.advanceTimersByTimeAsync(60_000);
			expect(running.dispatched).toHaveLength(0);
			expect(initMaintenanceSaga).not.toHaveBeenCalled();
			visible.mockReturnValue('visible');
			online.mockReturnValue(false);
			await jest.advanceTimersByTimeAsync(60_000);
			expect(running.dispatched).toHaveLength(0);
			expect(initMaintenanceSaga).not.toHaveBeenCalled();
			online.mockReturnValue(true);
			await jest.advanceTimersByTimeAsync(60_000);
			expect(running.workflowRefreshes()).toHaveLength(1);
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(1);
		} finally {
			running.task.cancel();
			await running.task.toPromise();
		}
	});

	it('cancels reconciliation and pending maintenance when the session logs out', async () => {
		let token: string | null = 'signed-in';
		const maintenanceStopped = jest.fn();
		(getAccessToken as jest.Mock).mockImplementation(() => token);
		(initMaintenanceSaga as jest.Mock).mockImplementation(function* () {
			try {
				yield new Promise(() => {});
			} finally {
				maintenanceStopped();
			}
		});
		const running = start();
		try {
			await jest.advanceTimersByTimeAsync(60_000);
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(1);
			token = null;
			running.input.put({ type: 'SESSION_LOGGED_OUT' });
			expect(running.close).toHaveBeenCalledTimes(1);
			expect(maintenanceStopped).toHaveBeenCalledTimes(1);
			const count = running.dispatched.length;
			await jest.advanceTimersByTimeAsync(180_000);
			expect(running.dispatched).toHaveLength(count);
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(1);
			expect(jest.getTimerCount()).toBe(0);
		} finally {
			running.task.cancel();
			await running.task.toPromise();
		}
	});

	it('bounds a hanging maintenance request to ten seconds and still runs the next cycle', async () => {
		const maintenanceStopped = jest.fn();
		(initMaintenanceSaga as jest.Mock).mockImplementation(function* () {
			try {
				yield new Promise(() => {});
			} finally {
				maintenanceStopped();
			}
		});
		const running = start();
		try {
			await jest.advanceTimersByTimeAsync(60_000);
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(1);
			running.emit({ type: 'CARD_UPDATE_DURING_MAINTENANCE' });
			expect(running.dispatched).toContainEqual({ type: 'CARD_UPDATE_DURING_MAINTENANCE' });
			await jest.advanceTimersByTimeAsync(9_999);
			expect(maintenanceStopped).not.toHaveBeenCalled();
			await jest.advanceTimersByTimeAsync(1);
			expect(maintenanceStopped).toHaveBeenCalledTimes(1);
			await jest.advanceTimersByTimeAsync(60_000);
			expect(initMaintenanceSaga).toHaveBeenCalledTimes(2);
			expect(running.workflowRefreshes()).toHaveLength(2);
		} finally {
			running.task.cancel();
			await running.task.toPromise();
		}
		expect(maintenanceStopped).toHaveBeenCalledTimes(2);
	});
});
