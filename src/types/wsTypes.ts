import type {
	WSDesignWorkflowInvalidateAction,
	WSMaintenanceAction,
	WSUserAvatarAction,
	WSReconnectedAction,
} from '@/store/actions/wsActions';

export interface WSMaintenanceBootstrap {
	maintenance: boolean;
}

export type WSAction =
	| ReturnType<typeof WSUserAvatarAction>
	| ReturnType<typeof WSMaintenanceAction>
	| ReturnType<typeof WSReconnectedAction>
	| ReturnType<typeof WSDesignWorkflowInvalidateAction>;

type WSMessage = {
	type: string;
	pk?: number;
	avatar?: string;
	maintenance?: boolean;
	event?: string;
	task_id?: number;
	project_id?: number;
	notification_id?: number;
};

export type WSEnvelope = {
	message: WSMessage;
};
