import {
	mockMarkNotificationRead,
	mockUseGetNotificationsQuery,
	designerA,
	notifications,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('toggles the unread notification filter accessibly and keeps mark-all working', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Notifications" variant="notifications" />);
	const toggle = screen.getByRole('button', { name: 'Unread only' });
	expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await user.click(toggle);
	expect(toggle).toHaveAttribute('aria-pressed', 'true');
	expect(mockUseGetNotificationsQuery).toHaveBeenLastCalledWith({ unread: true }, { skip: false });
	await user.click(toggle);
	expect(toggle).toHaveAttribute('aria-pressed', 'false');
	expect(mockUseGetNotificationsQuery).toHaveBeenLastCalledWith(undefined, { skip: false });
	await user.click(screen.getByRole('button', { name: 'Mark all read' }));
	expect(mockMarkNotificationRead).toHaveBeenCalledWith(301);
	expect(mockMarkNotificationRead).not.toHaveBeenCalledWith(302);
});

it('shows delivered reminder notes and links directly to their message', () => {
	mockProfile(designerA);
	mockUseGetNotificationsQuery.mockReturnValue({
		data: [
			{
				...notifications[0],
				type: 'chat_message',
				task: null,
				project: null,
				payload: {
					kind: 'reminder',
					title: 'Rappel de message',
					note: 'Check final materials',
					thread_id: 33,
					message_id: 92,
				},
			},
		],
	});
	render(<DesignWorkflowShell title="Notifications" variant="notifications" />);
	expect(screen.getByText('Message reminder')).toBeInTheDocument();
	expect(screen.getByText('Check final materials')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Open chat' })).toHaveAttribute(
		'href',
		'/dashboard/chat?thread=33&message=92',
	);
});
