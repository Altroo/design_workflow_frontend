import { fireEvent, render, screen } from '@testing-library/react';
import MobileActionsMenu from './mobileActionsMenu';

it('hides unavailable actions and prevents a selected action from opening the row', () => {
	const action = jest.fn(),
		row = jest.fn();
	render(
		<div onClick={row}>
			<MobileActionsMenu
				actions={[
					{ label: 'Edit', icon: null, onClick: action },
					{ label: 'Delete', icon: null, onClick: jest.fn(), show: false },
				]}
			/>
		</div>,
	);
	expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
	expect(action).toHaveBeenCalled();
	expect(row).not.toHaveBeenCalled();
});
