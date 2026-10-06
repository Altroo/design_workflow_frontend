import { fireEvent, render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { DesktopNotificationControls } from './desktopNotificationControls';

const controls = {
	permission: 'default' as NotificationPermission,
	enabled: false,
	sound: true,
	requesting: false,
	failed: false,
	enable: jest.fn(),
	disable: jest.fn(),
	test: jest.fn(),
	setSound: jest.fn(),
};
beforeEach(() => jest.clearAllMocks());

it('offers explicit enable before permission and test / sound controls afterwards', () => {
	const { rerender } = render(<DesktopNotificationControls copy={en.workflow} controls={controls} />);
	fireEvent.click(screen.getByRole('button', { name: en.workflow.labels.desktopEnable }));
	expect(controls.enable).toHaveBeenCalled();
	expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
	rerender(
		<DesktopNotificationControls copy={en.workflow} controls={{ ...controls, permission: 'granted', enabled: true }} />,
	);
	fireEvent.click(screen.getByRole('checkbox', { name: en.workflow.labels.desktopSound }));
	expect(controls.setSound).toHaveBeenCalledWith(false);
	fireEvent.click(screen.getByRole('button', { name: en.workflow.labels.desktopTest }));
	expect(controls.test).toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: en.workflow.labels.desktopDisable }));
	expect(controls.disable).toHaveBeenCalled();
});

it('explains denied and unsupported permissions without offering an impossible prompt', () => {
	const { rerender } = render(
		<DesktopNotificationControls copy={en.workflow} controls={{ ...controls, permission: 'denied' }} />,
	);
	expect(screen.getByText(en.workflow.labels.desktopBlocked)).toBeInTheDocument();
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	rerender(
		<DesktopNotificationControls
			copy={en.workflow}
			controls={{ ...controls, permission: 'unsupported', failed: true }}
		/>,
	);
	expect(screen.getByText(en.workflow.labels.desktopUnsupported)).toBeInTheDocument();
	expect(screen.getByRole('alert')).toHaveTextContent(en.workflow.labels.desktopError);
});
