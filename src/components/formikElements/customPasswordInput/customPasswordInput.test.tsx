import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomPasswordInput from './customPasswordInput';

it('toggles visibility without submitting or changing the password', () => {
	const ref = createRef<HTMLInputElement>(),
		onChange = jest.fn();
	render(<CustomPasswordInput id="password" label="Password" value="secret" ref={ref} onChange={onChange} />);
	expect(ref.current).toHaveAttribute('type', 'password');
	fireEvent.click(screen.getByRole('button'));
	expect(ref.current).toHaveAttribute('type', 'text');
	expect(ref.current).toHaveValue('secret');
	expect(onChange).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button'));
	expect(ref.current).toHaveAttribute('type', 'password');
});
