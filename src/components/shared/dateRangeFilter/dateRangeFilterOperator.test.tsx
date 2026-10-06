import { fireEvent, render, screen } from '@testing-library/react';
import { createDateRangeFilterOperator } from './dateRangeFilterOperator';

it('delegates filtering to the server and prevents inverted ranges', () => {
	const operator = createDateRangeFilterOperator()[0],
		applyValue = jest.fn();
	expect(operator.getApplyFilterFn()).toBeNull();
	const Input = operator.InputComponent;
	render(<Input item={{ value: { from: '2026-10-01', to: '2026-10-05' } }} applyValue={applyValue} />);
	const inputs = screen.getAllByDisplayValue(/2026-10/);
	fireEvent.change(inputs[0], { target: { value: '2026-10-10' } });
	expect(applyValue).toHaveBeenLastCalledWith({ value: { from: '2026-10-10', to: '2026-10-10' } });
	applyValue.mockClear();
	fireEvent.change(inputs[1], { target: { value: '2026-10-09' } });
	expect(applyValue).not.toHaveBeenCalled();
});
