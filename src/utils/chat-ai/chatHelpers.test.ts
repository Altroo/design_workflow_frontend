import { chatContext, chatErrorText, safeChatNavigation } from './chatHelpers';
import { ChatAPIError } from '@/store/services/chatAssistant';
import { chatAiFr, chatAiEn } from '@/translations/chatAi';
import type { ChatNavigation } from '@/types/chatAiTypes';
jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));
jest.mock('@/utils/helpers', () => ({ handleUnauthorized: jest.fn() }));

const target: ChatNavigation = {
	application: 'design_workflow',
	company_id: 1,
	resource: 'task',
	identifier: 5,
	href: '/dashboard/tasks/5',
};
it('allows only exact native routes and current manager-only access', () => {
	expect(safeChatNavigation(target, false)).toBe('/dashboard/tasks/5');
	for (const invalid of [
		{ ...target, href: 'https://example.com' },
		{ ...target, company_id: 2 },
		{ ...target, identifier: 0 },
		{ ...target, href: '/dashboard/tasks/5?redirect=https://example.com' },
	])
		expect(safeChatNavigation(invalid, true)).toBeNull();
	const report = { ...target, resource: 'reports', identifier: null, href: '/dashboard/reports/time' };
	expect(safeChatNavigation(report, false)).toBeNull();
	expect(safeChatNavigation(report, true)).toBe(report.href);
});
it('provides only known page context, not user-supplied query strings', () => {
	expect(chatContext('/dashboard/tasks/12', 'fr')).toEqual({
		resource: 'task',
		identifier: 12,
		interface_language: 'fr',
	});
	expect(chatContext('/dashboard/projects', 'en')).toEqual({ interface_language: 'en' });
});
it('renders friendly localized errors with matching translation keys', () => {
	expect(chatErrorText(new ChatAPIError('PERMISSION_DENIED'), chatAiFr)).toBe(chatAiFr.errors.PERMISSION_DENIED);
	expect(chatErrorText(new Error('private details'), chatAiEn)).toBe(chatAiEn.unknown);
	expect(Object.keys(chatAiFr)).toEqual(Object.keys(chatAiEn));
	expect(Object.keys(chatAiFr.errors)).toEqual(Object.keys(chatAiEn.errors));
});
