import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomOutlinedText from './customOutlinedText';

it('connects the ref and preserves slot-provided handlers', () => {
	const ref = createRef<HTMLInputElement>(),
		onChange = jest.fn(),
		slotChange = jest.fn();
	render(
		<CustomOutlinedText
			id="code"
			type="text"
			value=""
			label="Code"
			ref={ref}
			onChange={onChange}
			slotProps={{ htmlInput: { maxLength: 6, onChange: slotChange } }}
		/>,
	);
	const input = screen.getByLabelText('Code');
	expect(ref.current).toBe(input);
	expect(input).toHaveAttribute('maxlength', '6');
	fireEvent.change(input, { target: { value: '123' } });
	expect(slotChange).toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
});

it('renders disabled and validation states', () => {
	render(<CustomOutlinedText id="code" type="text" value="" label="Code" disabled error helperText="Invalid code" />);
	expect(screen.getByLabelText('Code')).toBeDisabled();
	expect(screen.getByText('Invalid code')).toBeInTheDocument();
});
