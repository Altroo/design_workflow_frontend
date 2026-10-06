import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomTextInput from './customTextInput';

it.each([false, true])('supports refs, labels and change events (multiline=%s)', (multiline) => {
	const ref = createRef<HTMLInputElement | HTMLTextAreaElement>(),
		onChange = jest.fn();
	render(
		<CustomTextInput
			id="title"
			label="Title"
			type="text"
			value="Original"
			ref={ref}
			onChange={onChange}
			multiline={multiline}
			rows={3}
		/>,
	);
	const input = screen.getByRole('textbox', { name: 'Title' });
	expect(ref.current).toBe(input);
	expect(input.tagName).toBe(multiline ? 'TEXTAREA' : 'INPUT');
	fireEvent.change(input, { target: { value: 'Changed' } });
	expect(onChange).toHaveBeenCalled();
});
