import { boardTask } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { en } from '@/translations/en';
import { WorkflowBoardCalendar } from '@/components/design-workflow/board/workflowBoardCalendar';

const model = (): ComponentProps<typeof WorkflowBoardCalendar>['model'] => ({
	boardCalendarMonth: new Date(2026, 3, 1),
	filteredBoardTasks: [boardTask],
	workflow: en.workflow,
	setBoardCalendarMonth: jest.fn(),
	locale: 'en-GB',
	calendarWeekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	setSelectedTaskId: jest.fn(),
	labelFor: String,
});
it('opens a scheduled or undated task without changing its status or order', async () => {
	const user = userEvent.setup();
	const state = model();
	state.filteredBoardTasks.push({ ...boardTask, id: 502, title: 'No deadline', due_date: null });
	const { container } = render(<WorkflowBoardCalendar model={state} />);
	expect(container.querySelectorAll('.workflow-calendar-day')).toHaveLength(42);
	await user.click(screen.getByRole('button', { name: new RegExp(boardTask.title) }));
	expect(state.setSelectedTaskId).toHaveBeenLastCalledWith(boardTask.id);
	await user.click(screen.getByRole('button', { name: /No deadline/ }));
	expect(state.setSelectedTaskId).toHaveBeenLastCalledWith(502);
});
it('navigates calendar months and marks overflow counts', async () => {
	const user = userEvent.setup();
	const state = model();
	state.filteredBoardTasks = Array.from({ length: 5 }, (_, i) => ({ ...boardTask, id: i, title: `Card ${i}` }));
	render(<WorkflowBoardCalendar model={state} />);
	expect(screen.getByText(`2 ${en.workflow.labels.moreTasks}`)).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: en.workflow.labels.previousMonth }));
	expect(state.setBoardCalendarMonth).toHaveBeenLastCalledWith(new Date(2026, 2, 1));
	await user.click(screen.getByRole('button', { name: en.workflow.labels.nextMonth }));
	expect(state.setBoardCalendarMonth).toHaveBeenLastCalledWith(new Date(2026, 4, 1));
});
