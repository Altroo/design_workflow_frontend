import { boardTask } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import {
	addCalendarMonths,
	boardChanged,
	getCalendarDays,
	getCalendarSeedMonth,
	getColumnId,
	getDateKey,
	getMonthStart,
	getTaskDragId,
	getTaskIdFromDragId,
	isCardInteractiveTarget,
	isColumnDragId,
	isTaskDragId,
	isTaskStatus,
	moveTaskToBoardIndex,
	parseTaskDueDate,
} from './workflowBoardHelpers';

it('builds complete six-week calendar grids across a year boundary', () => {
	const month = addCalendarMonths(new Date(2026, 11, 20), 1);
	expect(getDateKey(month)).toBe('2027-01-01');
	expect(getMonthStart(new Date(2026, 1, 28))).toEqual(new Date(2026, 1, 1));
	const days = getCalendarDays(month);
	expect(days).toHaveLength(42);
	expect(days[0].getDay()).toBe(0);
	expect(new Set(days.map(getDateKey)).size).toBe(42);
});

it('ignores missing and invalid deadlines when seeding a calendar', () => {
	expect(parseTaskDueDate('invalid')).toBeNull();
	expect(parseTaskDueDate(null)).toBeNull();
	expect(getCalendarSeedMonth([{ ...boardTask, due_date: '2026-05-20' }, boardTask])).toEqual(new Date(2026, 3, 1));
});

it('uses the current month for an undated board', () => {
	jest.useFakeTimers().setSystemTime(new Date(2026, 9, 6, 12));
	try {
		expect(getCalendarSeedMonth([{ ...boardTask, due_date: null }])).toEqual(new Date(2026, 9, 1));
	} finally {
		jest.useRealTimers();
	}
});

it('reorders within a column with stable ID tie-breaking and clamps negative drop positions', () => {
	const cards = [{ ...boardTask, id: 503, sort_order: 1 }, { ...boardTask, id: 502, sort_order: 1 }, boardTask];
	const result = moveTaskToBoardIndex(cards, 501, 'todo', -10)!;
	expect(result.nextBoard.map((card) => card.id)).toEqual([501, 502, 503]);
	expect(result.nextBoard.map((card) => card.sort_order)).toEqual([0, 1, 2]);
	expect(boardChanged([], [boardTask])).toBe(true);
	expect(isTaskDragId('column-todo')).toBe(false);
	expect(isColumnDragId('task-1')).toBe(false);
});

it('moves a card between columns, clamps its index and leaves input data unchanged', () => {
	const cards = [boardTask, { ...boardTask, id: 502, status: 'in_progress' as const, sort_order: 7 }];
	const result = moveTaskToBoardIndex(cards, boardTask.id, 'in_progress', 50)!;
	expect(result.nextStatus).toBe('in_progress');
	expect(result.nextSortOrder).toBe(1);
	expect(result.nextBoard.map((card) => [card.id, card.sort_order])).toEqual([
		[502, 0],
		[501, 1],
	]);
	expect(cards[0].status).toBe('todo');
	expect(cards[1].sort_order).toBe(7);
	expect(boardChanged(cards, result.nextBoard)).toBe(true);
	expect(boardChanged(cards, [...cards])).toBe(false);
	expect(moveTaskToBoardIndex(cards, 999, 'done', 0)).toBeNull();
});

it('distinguishes card and column drag ids and ignores interactive card children', () => {
	expect(isTaskDragId(getTaskDragId(12))).toBe(true);
	expect(getTaskIdFromDragId(getTaskDragId(12))).toBe(12);
	expect(isColumnDragId(getColumnId('done'))).toBe(true);
	expect(isTaskStatus('done')).toBe(true);
	expect(isTaskStatus('unknown')).toBe(false);
	const button = document.createElement('button'),
		child = document.createElement('span');
	button.append(child);
	expect(isCardInteractiveTarget(child)).toBe(true);
	expect(isCardInteractiveTarget(document.createElement('div'))).toBe(false);
	expect(isCardInteractiveTarget(null)).toBe(false);
});
