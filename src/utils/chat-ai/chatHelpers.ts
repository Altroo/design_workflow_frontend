import type { ChatContext, ChatNavigation } from '@/types/chatAiTypes';
import type { ChatAiCopy } from '@/translations/chatAi';
import { ChatAPIError } from '@/store/services/chatAssistant';

const routes: Record<string, string> = {
	overview: '/dashboard/overview',
	projects: '/dashboard/projects',
	board: '/dashboard/board',
	chat: '/dashboard/chat',
	notifications: '/dashboard/notifications',
	reports: '/dashboard/reports/time',
	team: '/dashboard/team',
	changelog: '/dashboard/changelog',
};
export const safeChatNavigation = (target: ChatNavigation, canViewManagementPages: boolean) => {
	if (target.application !== 'design_workflow' || target.company_id !== 1) return null;
	if (['reports', 'team', 'overview'].includes(target.resource) && !canViewManagementPages) return null;
	let expected: string;
	if (Object.hasOwn(routes, target.resource) && target.identifier === null) expected = routes[target.resource];
	else {
		if (
			!['project', 'task'].includes(target.resource) ||
			!Number.isSafeInteger(target.identifier) ||
			target.identifier! < 1 ||
			target.identifier! > 2147483647
		)
			return null;
		expected = `/dashboard/${target.resource === 'project' ? 'projects' : 'tasks'}/${target.identifier}`;
	}
	return target.href === expected ? expected : null;
};

export const chatContext = (pathname: string, language: 'fr' | 'en'): ChatContext => {
	const match = pathname.match(/^\/dashboard\/(projects|tasks)\/([1-9]\d*)\/?$/);
	return {
		interface_language: language,
		...(match
			? { resource: match[1] === 'projects' ? ('project' as const) : ('task' as const), identifier: Number(match[2]) }
			: {}),
	};
};

export const chatErrorText = (error: unknown, copy: ChatAiCopy) => {
	if (error instanceof DOMException && error.name === 'TimeoutError') return copy.errors.MODEL_TIMEOUT;
	const code = error instanceof ChatAPIError ? error.code : '';
	return Object.hasOwn(copy.errors, code) ? copy.errors[code as keyof typeof copy.errors] : copy.unknown;
};
