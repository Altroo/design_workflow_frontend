import { translations } from '@/translations';
import { DASHBOARD_CHAT, DASHBOARD_NOTIFICATIONS } from '@/utils/routes';
import { getWorkflowNavigation } from './workflowNavigation';

describe('getWorkflowNavigation', () => {
	it('shows unread message and notification counts on their navigation items', () => {
		const items = getWorkflowNavigation(translations.fr, false, 3, 7);

		expect(items.find((item) => item.path === DASHBOARD_CHAT)?.badge).toBe(7);
		expect(items.find((item) => item.path === DASHBOARD_NOTIFICATIONS)?.badge).toBe(3);
	});
});
