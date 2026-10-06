import { render, screen } from '@testing-library/react';
import { WorkflowAvatar } from './workflowAvatar';
const user = { first_name: 'Ibtissam', last_name: 'Dardour', email: 'test@example.com', avatar: '/avatar.png' };

it('prioritizes the picture and keeps its container circular at the requested size', () => {
	render(<WorkflowAvatar user={user} size={34} />);
	expect(screen.getByRole('img', { name: 'Ibtissam Dardour' })).toHaveAttribute('src', '/avatar.png');
	expect(screen.queryByText('ID')).not.toBeInTheDocument();
	expect(screen.getByRole('img').parentElement).toHaveStyle({ width: '34px', height: '34px', borderRadius: '50%' });
});

it('falls back to initials and displays current online/offline status', () => {
	const { rerender } = render(<WorkflowAvatar user={{ ...user, avatar: null }} showPresence online />);
	expect(screen.getByText('ID')).toBeInTheDocument();
	expect(screen.getByLabelText('Ibtissam Dardour online')).toHaveAttribute('data-online', 'true');
	rerender(<WorkflowAvatar user={{ ...user, avatar: null }} showPresence online={false} />);
	expect(screen.getByLabelText('Ibtissam Dardour offline')).toHaveAttribute('data-online', 'false');
});
