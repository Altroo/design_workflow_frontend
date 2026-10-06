import { fireEvent, render, screen } from '@testing-library/react';
import NavigationBar from './navigationBar';
import { en } from '@/translations/en';

jest.mock('@/providers/desktopNotificationsProvider', () => ({
	useDesktopNotificationControls: () => ({
		permission: 'default',
		enabled: false,
		sound: true,
		requesting: false,
		failed: false,
		enable: jest.fn(),
		disable: jest.fn(),
		test: jest.fn(),
		setSound: jest.fn(),
	}),
}));
let mockProfile = {
	id: 1,
	first_name: 'Ibtissam',
	last_name: 'Dardour',
	email: 'test@example.com',
	role: 'designer',
	is_staff: false,
	avatar: '/avatar.png',
};
const mockRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() };
jest.mock('next/navigation', () => ({ usePathname: () => '/dashboard/board', useRouter: () => mockRouter }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: {} } }), signOut: jest.fn() }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => mockProfile,
	useLanguage: () => ({ t: en, language: 'en', setLanguage: jest.fn() }),
}));
jest.mock('@/components/shared/workflow/realtimeStatus', () => ({ __esModule: true, default: () => null }));
jest.mock('@/store/services/designWorkflow', () => ({
	useGetNotificationsQuery: () => ({
		data: [1, 2].map((id) => ({
			id,
			type: 'task_overdue',
			payload: {},
			created_at: '2026-10-05T09:00:00Z',
			task: null,
			project: null,
		})),
	}),
	useGetChatThreadsQuery: () => ({ data: [{ unread_count: 2 }, { unread_count: 3 }] }),
	useMarkNotificationReadMutation: () => [jest.fn()],
}));
beforeEach(() => {
	mockProfile = { ...mockProfile, role: 'designer', is_staff: false };
	window.innerWidth = 1280;
});

it('keeps unread counts visible on inactive navigation items and hides manager tools from designers', () => {
	render(<NavigationBar title="Board">Board content</NavigationBar>);
	expect(screen.getByText('Board content')).toBeInTheDocument();
	expect(screen.getAllByLabelText(`5 ${en.workflow.labels.chatTitle}`)[0]).toHaveTextContent('5');
	expect(screen.getAllByLabelText(`2 ${en.navigation.notifications}`)[0]).toHaveTextContent('2');
	expect(screen.queryByRole('link', { name: en.navigation.reports })).not.toBeInTheDocument();
});

it('shows manager reports and opens the profile menu from the avatar', () => {
	mockProfile = { ...mockProfile, role: 'manager' };
	render(<NavigationBar title="Board">Board content</NavigationBar>);
	expect(screen.getByRole('link', { name: en.navigation.reports })).toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: 'Ibtissam Dardour' }));
	expect(screen.getByRole('button', { name: 'Ibtissam Dardour' })).toHaveAttribute('aria-expanded', 'true');
	expect(screen.getByRole('button', { name: en.navigation.logout })).toBeInTheDocument();
});

it('opens and closes the mobile drawer with Escape and restores body scrolling', () => {
	window.innerWidth = 390;
	render(<NavigationBar title="Board">Board content</NavigationBar>);
	fireEvent.click(screen.getByRole('button', { name: en.accessibility.toggleDrawer }));
	expect(document.body.style.overflow).toBe('hidden');
	expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
	fireEvent.keyDown(document, { key: 'Escape' });
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(document.body.style.overflow).not.toBe('hidden');
});

it('makes desktop notification settings accessible from the bell', () => {
	render(<NavigationBar title="Board">Board content</NavigationBar>);
	fireEvent.click(screen.getByRole('button', { name: en.navigation.notifications }));
	expect(screen.getByRole('region', { name: en.workflow.labels.desktopTitle })).toBeInTheDocument();
});
