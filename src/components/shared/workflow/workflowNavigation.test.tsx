import { translations } from '@/translations';
import { DASHBOARD_CHAT, DASHBOARD_NOTIFICATIONS, DASHBOARD_CHANGELOG } from '@/utils/routes';
import { getWorkflowNavigation } from './workflowNavigation';

describe('getWorkflowNavigation', () => {
	it.each([true, false])('places Changelog just after Notifications for manager=%s', (manager) => {
		for (const language of ['fr', 'en'] as const) {
			const items = getWorkflowNavigation(translations[language], manager);
			const index = items.findIndex((item) => item.path === DASHBOARD_NOTIFICATIONS);
			expect(items[index + 1]).toMatchObject({
				path: DASHBOARD_CHANGELOG,
				label: translations[language].navigation.changelog,
			});
		}
	});

	it('shows unread message and notification counts on their navigation items', () => {
		const items = getWorkflowNavigation(translations.fr, false, 3, 7);

		expect(items.find((item) => item.path === DASHBOARD_CHAT)?.badge).toBe(7);
		expect(items.find((item) => item.path === DASHBOARD_NOTIFICATIONS)?.badge).toBe(3);
	});
});
