import * as types from './index';

export const WSUserAvatarAction = (pk: number, avatar: string) => {
	return {
		type: types.WS_USER_AVATAR,
		pk,
		avatar,
	};
};

export const WSMaintenanceAction = (maintenance: boolean, version?: string) => {
	return {
		type: types.WS_MAINTENANCE,
		maintenance,
		...(version === undefined ? {} : { version }),
	};
};

export const WSReconnectedAction = () => {
	return {
		type: types.WS_RECONNECTED,
	};
};

export const WSDesignWorkflowInvalidateAction = (
	channel: 'TASK_EVENT' | 'NOTIFICATION' | 'WORKFLOW_EVENT' | 'CHAT_EVENT',
	scope?: string,
) => {
	return {
		type: types.WS_DESIGN_WORKFLOW_INVALIDATE,
		channel,
		...(scope ? { scope } : {}),
	};
};

export const WSUserPresenceAction = (userId: number, online: boolean, onlineUserIds: number[]) => {
	return {
		type: types.WS_USER_PRESENCE,
		userId,
		online,
		onlineUserIds,
	};
};
