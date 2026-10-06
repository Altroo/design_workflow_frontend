import { fireEvent, render, screen } from '@testing-library/react';
import DropdownFilter, { createBooleanFilterOperators, createDropdownFilterOperators } from './dropdownFilter';

const options = [
	{ value: 'true', label: 'Active' },
	{ value: 'false', label: 'Inactive' },
];

it('emits selected filter values', () => {
	const applyValue = jest.fn();
	render(<DropdownFilter item={{ value: '' }} applyValue={applyValue} options={options} />);
	fireEvent.change(screen.getByRole('combobox'), { target: { value: 'false' } });
	expect(applyValue).toHaveBeenCalledWith({ value: 'false' });
});

it('distinguishes false from an unset filter and uses exact string matching', () => {
	const boolean = createBooleanFilterOperators(options)[0];
	expect(boolean.getApplyFilterFn({ value: '' })).toBeNull();
	expect(boolean.getApplyFilterFn({ value: 'false' })!(false)).toBe(true);
	expect(boolean.getApplyFilterFn({ value: 'false' })!(true)).toBe(false);
	const text = createDropdownFilterOperators(options)[0];
	expect(text.getApplyFilterFn({ value: 'true' })!('true')).toBe(true);
	expect(text.getApplyFilterFn({ value: 'true' })!(true)).toBe(false);
});
