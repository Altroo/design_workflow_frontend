import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AvatarTooltip } from './avatarTooltip';

const originalResizeObserver = global.ResizeObserver;
beforeAll(() => {
	global.ResizeObserver = class {
		observe = jest.fn();
		unobserve = jest.fn();
		disconnect = jest.fn();
	};
});
afterAll(() => { global.ResizeObserver = originalResizeObserver; });

describe('card avatar tooltip', () => {
	it('shows the full name on hover, then hides when leaving', async () => {
		const user = userEvent.setup();
		render(<AvatarTooltip name="Ibtissam Dardour"><span>ID</span></AvatarTooltip>);
		const avatar = screen.getByRole('button', { name: 'Ibtissam Dardour' });
		await user.hover(avatar);
		expect(await screen.findByRole('tooltip')).toHaveTextContent('Ibtissam Dardour');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		await user.unhover(avatar);
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
	});

	it('works on keyboard focus and Escape without opening the card', async () => {
		const user = userEvent.setup();
		const openCard = jest.fn();
		render(<div onClick={openCard}><AvatarTooltip name="Maryam Designer"><span>MD</span></AvatarTooltip></div>);
		await user.tab();
		expect(await screen.findByRole('tooltip')).toHaveTextContent('Maryam Designer');
		expect(screen.getByRole('button', { name: 'Maryam Designer' })).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Maryam Designer' }));
		expect(await screen.findByRole('tooltip')).toHaveTextContent('Maryam Designer');
		expect(openCard).not.toHaveBeenCalled();
	});

	it('supports a touch tap without triggering the parent card', async () => {
		const openCard = jest.fn();
		render(<div onClick={openCard}><AvatarTooltip name="Designer Name"><span>DN</span></AvatarTooltip></div>);
		const avatar = screen.getByRole('button', { name: 'Designer Name' });
		fireEvent.pointerDown(avatar, { pointerType: 'touch' });
		fireEvent.click(avatar);
		expect(await screen.findByRole('tooltip')).toHaveTextContent('Designer Name');
		expect(openCard).not.toHaveBeenCalled();
	});
});
