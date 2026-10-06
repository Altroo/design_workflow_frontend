import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import type { TaskCard, TaskStatus } from '@/types/designWorkflowTypes';
import { isValid, parseISO } from 'date-fns';

export const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addCalendarMonths = (date: Date, months: number) =>
	new Date(date.getFullYear(), date.getMonth() + months, 1);

export const getDateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const parseTaskDueDate = (value: string | null | undefined) => {
	if (!value) return null;
	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : null;
};

export const getCalendarSeedMonth = (tasks: TaskCard[]) => {
	const firstDueTask = tasks
		.map((task) => parseTaskDueDate(task.due_date))
		.filter((date): date is Date => Boolean(date))
		.sort((left, right) => left.getTime() - right.getTime())[0];
	return firstDueTask ? getMonthStart(firstDueTask) : getMonthStart(new Date());
};

export const getCalendarDays = (month: Date) => {
	const monthStart = getMonthStart(month);
	const gridStart = new Date(monthStart);
	gridStart.setDate(monthStart.getDate() - monthStart.getDay());

	return Array.from({ length: 42 }, (_, index) => {
		const day = new Date(gridStart);
		day.setDate(gridStart.getDate() + index);
		return day;
	});
};

export const getColumnId = (status: TaskStatus) => `column-${status}`;

export const getTaskDragId = (taskId: number) => `task-${taskId}`;

export const isTaskDragId = (value: string) => value.startsWith('task-');

export const isColumnDragId = (value: string) => value.startsWith('column-');

export const getTaskIdFromDragId = (value: string) => Number(value.replace('task-', ''));

export const isTaskStatus = (value: string): value is TaskStatus => STATUS_COLUMNS.includes(value as TaskStatus);

export const isCardInteractiveTarget = (target: EventTarget | null) =>
	target instanceof HTMLElement && Boolean(target.closest('button, a, input, textarea, select, [data-no-card-open]'));

export const moveTaskToBoardIndex = (
	items: TaskCard[],
	taskId: number,
	targetStatus: TaskStatus,
	targetIndex: number,
) => {
	const movingTask = items.find((item) => item.id === taskId);
	if (!movingTask) return null;

	const columns = Object.fromEntries(
		STATUS_COLUMNS.map((status) => [
			status,
			items
				.filter((item) => item.status === status && item.id !== taskId)
				.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
		]),
	) as Record<TaskStatus, TaskCard[]>;

	const targetColumn = [...columns[targetStatus]];
	const insertIndex = Math.max(0, Math.min(targetIndex, targetColumn.length));
	targetColumn.splice(insertIndex, 0, { ...movingTask, status: targetStatus });
	columns[targetStatus] = targetColumn;

	const nextBoard = STATUS_COLUMNS.flatMap((status) =>
		columns[status].map((item, index) => ({
			...item,
			sort_order: index,
		})),
	);
	const nextTask = nextBoard.find((item) => item.id === taskId);
	if (!nextTask) return null;

	return {
		nextBoard,
		nextSortOrder: nextTask.sort_order,
		nextStatus: nextTask.status,
	};
};

export const boardChanged = (previousBoard: TaskCard[], nextBoard: TaskCard[]) =>
	nextBoard.some((nextTask) => {
		const previousTask = previousBoard.find((item) => item.id === nextTask.id);
		return !previousTask || previousTask.status !== nextTask.status || previousTask.sort_order !== nextTask.sort_order;
	});
