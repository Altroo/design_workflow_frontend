import type { tokenUser } from '@/types/next-auth';

type WorkflowAccessUser = Pick<tokenUser, 'role'> & {
	is_staff?: boolean | null;
	is_superuser?: boolean | null;
};

export const hasWorkflowManagerAccess = (user?: WorkflowAccessUser | null) =>
	Boolean(user && (user.role === 'manager' || user.is_staff || user.is_superuser));
