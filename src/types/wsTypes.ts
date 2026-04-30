import type {
	WSDesignWorkflowInvalidateAction,
	WSMaintenanceAction,
	WSUserAvatarAction,
	WSReconnectedAction,
	WSUserPresenceAction,
} from '@/store/actions/wsActions';

export interface WSMaintenanceBootstrap {
	maintenance: boolean;
}

export type WSAction =
	| ReturnType<typeof WSUserAvatarAction>
	| ReturnType<typeof WSMaintenanceAction>
	| ReturnType<typeof WSReconnectedAction>
	| ReturnType<typeof WSDesignWorkflowInvalidateAction>
	| ReturnType<typeof WSUserPresenceAction>;

type WSMessage = {
	type: string;
	pk?: number;
	avatar?: string;
	maintenance?: boolean;
	event?: string;
	task_id?: number;
	project_id?: number;
	notification_id?: number;
	user_id?: number;
	online?: boolean;
	online_user_ids?: number[];
};

export type WSEnvelope = {
	message: WSMessage;
};
