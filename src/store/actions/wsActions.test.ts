import * as types from './index';
import {
	WSDesignWorkflowInvalidateAction,
	WSMaintenanceAction,
	WSReconnectedAction,
	WSUserAvatarAction,
	WSUserPresenceAction,
} from './wsActions';

describe('WSUserAvatarAction', () => {
	it('should create WS_USER_AVATAR action with pk and avatar', () => {
		const pk = 123;
		const avatar = 'avatar.png';

		const action = WSUserAvatarAction(pk, avatar);

		expect(action).toEqual({
			type: types.WS_USER_AVATAR,
			pk,
			avatar,
		});
	});
});

describe('WSMaintenanceAction', () => {
	it('includes a version only when provided', () => {
		expect(WSMaintenanceAction(false, '1.10.0')).toEqual({
			type: types.WS_MAINTENANCE,
			maintenance: false,
			version: '1.10.0',
		});
	});

	it.each([true, false])('should preserve maintenance=%s', (maintenance) => {
		const action = WSMaintenanceAction(maintenance);

		expect(action).toEqual({
			type: types.WS_MAINTENANCE,
			maintenance,
		});
	});
});

describe('WSReconnectedAction', () => {
	it('should create WS_RECONNECTED action', () => {
		const action = WSReconnectedAction();
		expect(action).toEqual({ type: types.WS_RECONNECTED });
	});
});

describe('WSUserPresenceAction', () => {
	it('should create WS_USER_PRESENCE action', () => {
		expect(WSUserPresenceAction(5, true, [2, 5])).toEqual({
			type: types.WS_USER_PRESENCE,
			userId: 5,
			online: true,
			onlineUserIds: [2, 5],
		});
	});

	it('preserves offline state and an empty online user list', () => {
		expect(WSUserPresenceAction(5, false, [])).toEqual({
			type: types.WS_USER_PRESENCE,
			userId: 5,
			online: false,
			onlineUserIds: [],
		});
	});
});

describe('WSDesignWorkflowInvalidateAction', () => {
	it.each(['TASK_EVENT', 'NOTIFICATION', 'WORKFLOW_EVENT', 'CHAT_EVENT'] as const)(
		'preserves the %s channel and a supplied scope',
		(channel) => {
			expect(WSDesignWorkflowInvalidateAction(channel, 'project')).toEqual({
				type: types.WS_DESIGN_WORKFLOW_INVALIDATE,
				channel,
				scope: 'project',
			});
		},
	);

	it.each([undefined, ''])('omits an absent or empty scope (%s)', (scope) => {
		const action = WSDesignWorkflowInvalidateAction('TASK_EVENT', scope);
		expect(action).toEqual({ type: types.WS_DESIGN_WORKFLOW_INVALIDATE, channel: 'TASK_EVENT' });
		expect(action).not.toHaveProperty('scope');
	});
});
