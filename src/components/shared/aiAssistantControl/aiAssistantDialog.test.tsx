import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiAssistantDialog from './aiAssistantDialog';

it('portals outside forms, traps keyboard focus and closes only this dialog', async () => {
	const close = jest.fn();
	const outerClick = jest.fn();
	const outerEscape = jest.fn();
	window.addEventListener('keydown', outerEscape);
	const user = userEvent.setup();
	const view = render(
		<form onClick={outerClick}>
			<AiAssistantDialog
				title="AI preview"
				onClose={close}
				actions={[
					{ text: 'Cancel', active: false, onClick: close },
					{ text: 'Apply', active: true, onClick: jest.fn() },
				]}
			/>
		</form>,
	);
	expect(screen.getByRole('dialog').closest('form')).toBeNull();
	expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
	await user.tab({ shift: true });
	expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();
	await user.tab();
	expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
	outerEscape.mockClear();
	await user.keyboard('{Escape}');
	expect(close).toHaveBeenCalledTimes(1);
	expect(outerEscape).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Apply' }));
	expect(outerClick).not.toHaveBeenCalled();
	view.unmount();
	window.removeEventListener('keydown', outerEscape);
});
