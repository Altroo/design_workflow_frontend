import * as types from './index';

export const WSUserAvatarAction = (pk: number, avatar: string) => {
	return {
		type: types.WS_USER_AVATAR,
		pk,
		avatar,
	};
};

export const WSMaintenanceAction = (maintenance: boolean) => {
	return {
		type: types.WS_MAINTENANCE,
		maintenance,
	};
};

export const WSReconnectedAction = () => {
	return {
		type: types.WS_RECONNECTED,
	};
};

export const WSDesignWorkflowInvalidateAction = (channel: 'TASK_EVENT' | 'NOTIFICATION') => {
	return {
		type: types.WS_DESIGN_WORKFLOW_INVALIDATE,
		channel,
	};
};
