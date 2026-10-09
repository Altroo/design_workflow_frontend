import { render, screen, fireEvent } from '@testing-library/react';
import { Field, Area, WorkDaysField } from './workflowFields';
import type { AiAssistantControlProps } from '@/types/aiTypes';

jest.mock('@/components/shared/aiAssistantControl/aiAssistantControl', () => ({
	__esModule: true,
	default: ({ context, maxLength, onApply }: AiAssistantControlProps) => (
		<button
			data-testid="ai-control"
			data-context={context}
			data-max-length={maxLength}
			onClick={() => onApply('Corrected draft')}
		>
			Apply
		</button>
	),
}));

it.each(['text', 'email', 'url', 'password', 'number', 'date', 'search'])(
	'never infers AI from an input type or id: %s',
	(type) => {
		render(<Field id="description" value="Text" type={type} onChangeAction={jest.fn()} />);
		expect(screen.queryByTestId('ai-control')).not.toBeInTheDocument();
	},
);

it.each(['email', 'url', 'password', 'number', 'date'])(
	'does not add AI to non-writing fields even with an explicit context: %s',
	(type) => {
		render(<Field value="8" type={type} ai="task_title" onChangeAction={jest.fn()} />);
		expect(screen.queryByTestId('ai-control')).not.toBeInTheDocument();
	},
);

it('opts in reviewed prose fields and respects the maximum title length', () => {
	const apply = jest.fn();
	render(<Field value="Draft" ai="task_title" maxLength={255} onChangeAction={apply} />);
	expect(screen.getByTestId('ai-control')).toHaveAttribute('data-context', 'task_title');
	expect(screen.getByTestId('ai-control')).toHaveAttribute('data-max-length', '255');
	expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '255');
	fireEvent.click(screen.getByTestId('ai-control'));
	expect(apply).toHaveBeenCalledWith('Corrected draft');
});

it('opts in long-form writing but leaves unreviewed areas and work-day numbers alone', () => {
	const apply = jest.fn();
	render(
		<>
			<Area value="Notes" onChangeAction={apply} ai="review_note" />
			<Area value="Untouched" onChangeAction={apply} />
			<WorkDaysField value="480" onChangeAction={apply} />
		</>,
	);
	expect(screen.getAllByTestId('ai-control')).toHaveLength(1);
	fireEvent.click(screen.getByTestId('ai-control'));
	expect(apply).toHaveBeenCalledWith('Corrected draft');
});
