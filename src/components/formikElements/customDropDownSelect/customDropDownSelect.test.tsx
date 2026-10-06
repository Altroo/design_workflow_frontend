import { fireEvent, render, screen } from '@testing-library/react';
import CustomDropDownSelect from './customDropDownSelect';
import type { ComponentProps } from 'react';

beforeAll(() => {
	HTMLElement.prototype.scrollIntoView = jest.fn();
	HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
	HTMLElement.prototype.releasePointerCapture = jest.fn();
});

it('renders object labels and safely skips missing/empty options', () => {
	const items = [null, undefined, '', { code: 'fr', value: 'Français' }] as unknown as ComponentProps<
		typeof CustomDropDownSelect
	>['items'];
	render(<CustomDropDownSelect id="language" label="Language" items={items} value="fr" />);
	expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('Français');
});

it('emits the selected value with the expected form field name', () => {
	const onChange = jest.fn();
	render(
		<CustomDropDownSelect id="choice" label="Choice" items={['First', 'Second']} value="First" onChange={onChange} />,
	);
	fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
	fireEvent.click(screen.getByRole('option', { name: 'Second' }));
	expect(onChange).toHaveBeenCalledWith(
		expect.objectContaining({ target: { id: 'choice', name: 'choice', value: 'Second' } }),
	);
});

it('keeps disabled fields disabled and renders validation feedback', () => {
	render(
		<CustomDropDownSelect
			id="choice"
			label="Choice"
			items={['First']}
			value={null}
			disabled
			error
			helperText="Required"
		/>,
	);
	expect(screen.getByRole('combobox')).toBeDisabled();
	expect(screen.getByText('Required')).toBeInTheDocument();
});
