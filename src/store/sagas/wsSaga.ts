import { call, put, select, take, race, fork, cancel, delay } from 'redux-saga/effects';
import { getSession } from 'next-auth/react';
import { initWebsocket } from '@/store/services/ws';
import { getAccessToken } from '@/store/selectors';
import type { RootState } from '@/store/store';
import type { Action } from 'redux';
import type { EventChannel, SagaIterator, Task } from 'redux-saga';
import * as Types from '@/store/actions';
import { setWSMaintenance, setWSOnlineUsers } from '@/store/slices/wsSlice';
import { initMaintenanceSaga } from '@/store/sagas/_initSaga';
import { designWorkflowApi } from '@/store/services/designWorkflow';
import { profilApi, usersApi } from '@/store/services/account';

type WSChannelAction = Action & {
	maintenance?: boolean;
	channel?: 'TASK_EVENT' | 'NOTIFICATION' | 'WORKFLOW_EVENT' | 'CHAT_EVENT';
	scope?: string;
	onlineUserIds?: number[];
};

const allWorkflowTags = [
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
] as const;
const taskTags = ['Task', 'Project', 'Dashboard', 'Workload', 'Report', 'Chat', 'Search', 'Notification'] as const;

export function workflowTagsForEvent(action: WSChannelAction): readonly (typeof allWorkflowTags)[number][] {
	if (action.channel === 'TASK_EVENT') return taskTags;
	if (action.channel === 'CHAT_EVENT' || action.scope === 'chat') return ['Chat', 'Search'];
	if (action.channel === 'NOTIFICATION' || action.scope === 'notifications') return ['Notification'];
	if (action.scope === 'notification-preferences') return ['NotificationPreference'];
	if (action.scope === 'labels') return ['Label', 'Task', 'Project', 'Search'];
	if (action.scope === 'views') return ['SavedView'];
	if (action.scope === 'projects') return taskTags;
	return allWorkflowTags;
}

function* refreshAccountCaches(): SagaIterator<void> {
	yield put(usersApi.util.invalidateTags(['Users']));
	yield put(profilApi.util.invalidateTags(['Profil']));
}

function* refreshMaintenance(): SagaIterator<void> {
	try {
		yield race({ refresh: call(initMaintenanceSaga), timeout: delay(10_000) });
	} catch {
		/* Maintenance HTTP failure must not stop live updates. */
	}
}

// A minute-level reconciliation also refreshes running time/date boundaries and
// recovers a lost publication without relying on the socket disconnecting.
function* reconcileVisibleWorkspace(): SagaIterator<void> {
	while (true) {
		yield delay(60_000);
		if (typeof document !== 'undefined' && document.visibilityState === 'hidden') continue;
		if (typeof navigator !== 'undefined' && !navigator.onLine) continue;
		yield put(designWorkflowApi.util.invalidateTags([...allWorkflowTags]));
		yield call(refreshAccountCaches);
		yield call(refreshMaintenance);
	}
}

function* monitorToken(
	selector: (state: RootState) => string | null,
	previousValue: string | null,
	takePattern = '*',
): SagaIterator<string | null> {
	while (true) {
		const nextValue: string | null = yield select(selector);
		if (nextValue !== previousValue) {
			return nextValue;
		}
		yield take(takePattern);
	}
}

export function* watchWS(): SagaIterator<void> {
	while (true) {
		yield call(monitorToken, getAccessToken, null);
		const getToken = async (): Promise<string | null> => {
			const session = await getSession();
			return session?.accessToken ?? null;
		};
		const channel: EventChannel<WSChannelAction> = yield call(initWebsocket, getToken);
		const reconciliation: Task = yield fork(reconcileVisibleWorkspace);
		let maintenanceTask: Task | undefined;
		try {
			while (true) {
				const { action, loggedOut }: { action?: WSChannelAction; loggedOut?: string | null } = yield race({
					action: take(channel),
					loggedOut: call(
						monitorToken,
						(state: RootState) => (getAccessToken(state) ? 'authenticated' : null),
						'authenticated',
					),
				});
				if (loggedOut === null || !action) break;
				if (action.type === Types.WS_MAINTENANCE && typeof action.maintenance === 'boolean') {
					yield put(setWSMaintenance(action.maintenance));
				} else if (action.type === Types.WS_USER_PRESENCE && Array.isArray(action.onlineUserIds)) {
					yield put(setWSOnlineUsers(action.onlineUserIds));
				} else if (action.type === Types.WS_RECONNECTED) {
					yield put(designWorkflowApi.util.invalidateTags([...allWorkflowTags]));
					yield call(refreshAccountCaches);
					if (maintenanceTask) yield cancel(maintenanceTask);
					maintenanceTask = yield fork(refreshMaintenance);
				} else if (action.type === Types.WS_DESIGN_WORKFLOW_INVALIDATE) {
					yield put(designWorkflowApi.util.invalidateTags([...workflowTagsForEvent(action)]));
					if (action.scope === 'users') yield call(refreshAccountCaches);
				} else if (action.type === Types.WS_USER_AVATAR) {
					yield call(refreshAccountCaches);
					yield put(designWorkflowApi.util.invalidateTags([...allWorkflowTags]));
					yield put(action);
				} else {
					yield put(action);
				}
			}
		} finally {
			yield cancel(reconciliation);
			if (maintenanceTask) yield cancel(maintenanceTask);
			channel.close();
		}
	}
}
