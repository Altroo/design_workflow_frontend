import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import DesktopNotificationsProvider, { useDesktopNotificationControls } from './desktopNotificationsProvider';
import type { useDesktopNotifications } from '@/utils/workflow/hooks/useDesktopNotifications';

let mockSession: object | null = { user: {} };
const mockPush = jest.fn();
const mockHook = jest
	.fn<ReturnType<typeof useDesktopNotifications>, Parameters<typeof useDesktopNotifications>>()
	.mockReturnValue({
		permission: 'granted',
		enabled: true,
		sound: true,
		requesting: false,
		failed: false,
		enable: jest.fn(),
		disable: jest.fn(),
		setSound: jest.fn(),
		test: jest.fn(),
	});
const mockQuery = jest.fn<{ data: unknown[] }, unknown[]>().mockReturnValue({ data: [] });
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: mockSession }) }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => ({ id: 1, role: 'designer' }),
	useLanguage: () => ({ t: en, language: 'en' }),
}));
jest.mock('@/store/services/designWorkflow', () => ({
	useGetNotificationsQuery: (...args: unknown[]) => mockQuery(...args),
}));
jest.mock('@/utils/workflow/hooks/useDesktopNotifications', () => ({
	useDesktopNotifications: (...args: Parameters<typeof useDesktopNotifications>) => mockHook(...args),
}));

const Consumer = () => <p>{useDesktopNotificationControls().enabled ? 'enabled' : 'disabled'}</p>;
it('shares notification controls across pages and disables access when signed out', () => {
	mockSession = { user: {} };
	const { rerender } = render(
		<DesktopNotificationsProvider>
			<Consumer />
		</DesktopNotificationsProvider>,
	);
	expect(screen.getByText('enabled')).toBeInTheDocument();
	expect(mockHook).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 1, language: 'en' }));
	mockHook.mock.calls.at(-1)?.[0].onNavigate('/dashboard/chat?thread=7');
	expect(mockPush).toHaveBeenCalledWith('/dashboard/chat?thread=7');
	mockSession = null;
	rerender(
		<DesktopNotificationsProvider>
			<Consumer />
		</DesktopNotificationsProvider>,
	);
	expect(mockQuery).toHaveBeenLastCalledWith({ unread: true }, { skip: true });
	expect(mockHook).toHaveBeenLastCalledWith(expect.objectContaining({ userId: null }));
});
