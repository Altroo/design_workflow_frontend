'use client';
import {
	addCalendarMonths,
	getCalendarDays,
	getCalendarSeedMonth,
	getDateKey,
	parseTaskDueDate,
} from '@/utils/workflow/workflowBoardHelpers';
import { cn } from '@/utils/workflow/workflowFormatting';
import type { TaskCard } from '@/types/designWorkflowTypes';
import { format as formatDateFns } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowBoardCalendar = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'boardCalendarMonth'
		| 'filteredBoardTasks'
		| 'workflow'
		| 'setBoardCalendarMonth'
		| 'locale'
		| 'calendarWeekdays'
		| 'setSelectedTaskId'
		| 'labelFor'
	>;
}) => {
	const {
		boardCalendarMonth,
		filteredBoardTasks,
		workflow,
		setBoardCalendarMonth,
		locale,
		calendarWeekdays,
		setSelectedTaskId,
		labelFor,
	} = model;
	const calendarMonth = boardCalendarMonth ?? getCalendarSeedMonth(filteredBoardTasks);
	const calendarDays = getCalendarDays(calendarMonth);
	const calendarMonthKey = `${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`;
	const todayKey = getDateKey(new Date());
	const tasksByDueDate = filteredBoardTasks.reduce<Map<string, TaskCard[]>>((bucket, taskItem) => {
		const dueDate = parseTaskDueDate(taskItem.due_date);
		if (!dueDate) return bucket;
		const key = getDateKey(dueDate);
		bucket.set(key, [...(bucket.get(key) ?? []), taskItem]);
		return bucket;
	}, new Map());
	const unscheduledTasks = filteredBoardTasks.filter((taskItem) => !parseTaskDueDate(taskItem.due_date));
	const taskLabel = (count: number) => `${count} ${workflow.labels.moreTasks ?? 'more'}`;

	return (
		<div className="workflow-board-calendar">
			<div className="workflow-board-calendar-head">
				<button
					type="button"
					className="workflow-calendar-nav"
					aria-label={workflow.labels.previousMonth ?? 'Previous month'}
					onClick={() => setBoardCalendarMonth(addCalendarMonths(calendarMonth, -1))}
				>
					<ChevronLeft size={16} />
				</button>
				<div>
					<span>
						<CalendarDays size={15} />
						{workflow.labels.calendar ?? 'Calendar'}
					</span>
					<strong>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarMonth)}</strong>
				</div>
				<button
					type="button"
					className="workflow-calendar-nav"
					aria-label={workflow.labels.nextMonth ?? 'Next month'}
					onClick={() => setBoardCalendarMonth(addCalendarMonths(calendarMonth, 1))}
				>
					<ChevronRight size={16} />
				</button>
			</div>
			<div className="workflow-board-calendar-weekdays">
				{calendarWeekdays.map((day) => (
					<span key={day}>{day}</span>
				))}
			</div>
			<div className="workflow-board-calendar-grid">
				{calendarDays.map((day) => {
					const dayKey = getDateKey(day);
					const dayTasks = tasksByDueDate.get(dayKey) ?? [];
					const isCurrentMonth = `${day.getFullYear()}-${day.getMonth()}` === calendarMonthKey;
					return (
						<div
							key={dayKey}
							className={cn(
								'workflow-calendar-day',
								!isCurrentMonth && 'is-muted',
								dayKey === todayKey && 'is-today',
								dayTasks.some((taskItem) => taskItem.is_overdue) && 'has-overdue',
							)}
						>
							<span className="workflow-calendar-date">{formatDateFns(day, 'd')}</span>
							<div className="workflow-calendar-stack">
								{dayTasks.slice(0, 3).map((taskItem) => (
									<button
										type="button"
										key={taskItem.id}
										onClick={() => setSelectedTaskId(taskItem.id)}
										className={cn('workflow-calendar-task', taskItem.is_overdue && 'is-overdue')}
										data-status={taskItem.status}
									>
										<b>{taskItem.title}</b>
										<small>
											{labelFor(taskItem.status)} - {labelFor(taskItem.review_state)}
										</small>
									</button>
								))}
								{dayTasks.length > 3 ? <em>{taskLabel(dayTasks.length - 3)}</em> : null}
							</div>
						</div>
					);
				})}
			</div>
			{unscheduledTasks.length > 0 ? (
				<div className="workflow-calendar-unscheduled">
					<div>
						<span>{workflow.labels.unscheduled ?? 'Unscheduled'}</span>
						<strong>{unscheduledTasks.length}</strong>
					</div>
					{unscheduledTasks.slice(0, 6).map((taskItem) => (
						<button type="button" key={taskItem.id} onClick={() => setSelectedTaskId(taskItem.id)}>
							<b>{taskItem.title}</b>
							<small>{taskItem.project.name}</small>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
};
