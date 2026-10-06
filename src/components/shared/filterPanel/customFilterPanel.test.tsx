import { fireEvent, render, screen } from '@testing-library/react';
import CustomFilterPanel from './customFilterPanel';

it('clears filters without changing the chosen logical operator', () => {
	const onChange = jest.fn();
	render(<CustomFilterPanel filterModel={{ items: [], logicOperator: 'or' }} onChange={onChange} />);
	fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
	expect(onChange).toHaveBeenCalledWith({ items: [], logicOperator: 'or' });
});
