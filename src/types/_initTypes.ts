import type { Session } from 'next-auth';
import { WSMaintenanceBootstrap } from '@/types/wsTypes';

export type ApiErrorResponseType = {
	status_code: number;
	message: string;
	details?: Record<string, string[]>;
};

export type SuccessResponseType<T = unknown> = {
	status_code: number;
	message: string;
	data?: T;
};

export interface ResponseDataInterface<T> {
	data: T;
	status: number;
}

export type APIContentTypeInterface = 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data';

//!- Init State
export type InitStateToken = {
	user: {
		pk: number | null;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
		role?: 'manager' | 'designer' | null;
		is_staff?: boolean | null;
		is_superuser?: boolean | null;
	};
	access: string | null;
	refresh: string | null;
	access_expiration: string | null;
	refresh_expiration: string | null;
};

export interface InitStateInterface<T> {
	initStateToken: T;
}

export type AppSession = Session & {
	accessToken?: string;
	user?: Session['user'] & {
		accessToken?: string;
		pk?: number | string | null;
		first_name?: string | null;
		last_name?: string | null;
		role?: 'manager' | 'designer' | null;
		is_staff?: boolean | null;
		is_superuser?: boolean | null;
		can_view?: boolean | null;
		can_print?: boolean | null;
		can_create?: boolean | null;
		can_edit?: boolean | null;
		can_delete?: boolean | null;
	};
};

export type SessionProps = {
	session?: AppSession;
};

export type SagaPayloadType<T> = {
	type: string;
	data: T;
};

export type TokenType = {
	token?: string;
};

export interface PaginationResponseType<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: Array<T>;
}

export type MaintenanceGetRootResponseType = ResponseDataInterface<WSMaintenanceBootstrap>;
