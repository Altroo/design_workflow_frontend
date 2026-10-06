'use client';
import { AvatarBadge, Chip, Surface } from '@/components/shared/workflow/workflowFields';
import { formatMinutes, formatWorkDays, resolveMediaUrl } from '@/utils/workflow/workflowFormatting';
import { BOARD_STATUS_META } from '@/components/shared/workflow/boardAppearance';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskSnapshot = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'task'
		| 'labelFor'
		| 'taskDueDelivery'
		| 'dateFor'
		| 'renderSourceChatLink'
		| 'taskConflictNotice'
		| 'isManager'
	>;
}) => {
	const { workflow, task, labelFor, taskDueDelivery, dateFor, renderSourceChatLink, taskConflictNotice, isManager } =
		model;
	return (
		<Surface
			className="workflow-task-detail-panel workflow-task-detail-hero workflow-task-detail-snapshot"
			{...workflow.sections.taskSnapshot}
		>
			<div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
				<div
					className="workflow-task-detail-media"
					style={{ '--status-accent': BOARD_STATUS_META[task.status].accent } as CSSProperties}
				>
					{task.cover_image_url ? (
						<Image
							src={resolveMediaUrl(task.cover_image_url)}
							alt={task.cover_image_label || task.title}
							width={640}
							height={360}
							sizes="(max-width: 768px) 100vw, 640px"
							loading="eager"
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="workflow-task-detail-media-empty">
							{BOARD_STATUS_META[task.status].icon}
							<span>{labelFor(task.status)}</span>
						</div>
					)}
				</div>
				<div className="space-y-4">
					<div>
						<p className="text-xs font-bold uppercase text-(--ink-muted)">{task.project.name}</p>
						<h2 className="mt-2 text-2xl font-extrabold leading-tight text-(--ink)">{task.title}</h2>
					</div>
					<p className="text-sm leading-7 text-(--ink-soft)">{task.description || workflow.labels.noDescription}</p>
					<div className="flex flex-wrap gap-2">
						<Chip status={task.status}>{labelFor(task.status)}</Chip>
						<Chip>{labelFor(task.priority)}</Chip>
						<Chip>
							<span className="inline-flex items-center gap-2">
								{task.current_assignee ? <AvatarBadge user={task.current_assignee} size={20} showTooltip /> : null}
								<span>
									{task.current_assignee
										? `${task.current_assignee.first_name} ${task.current_assignee.last_name}`
										: workflow.labels.unassigned}
								</span>
							</span>
						</Chip>
						<Chip tone={taskDueDelivery?.tone}>{taskDueDelivery?.label ?? dateFor(task.due_date)}</Chip>
					</div>
					{renderSourceChatLink('detail')}
					{taskConflictNotice}
				</div>
				{isManager ? (
					<div className="workflow-task-stats grid gap-3 p-4">
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-(--ink-soft)">{workflow.labels.project}</p>
							<p className="mt-1 font-semibold text-(--ink)">{task.project.name}</p>
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-(--ink-soft)">{workflow.labels.estimated}</p>
							<p className="mt-1 font-semibold text-(--ink)">
								{formatWorkDays(task.estimated_minutes, workflow.labels.daysUnit)}
							</p>
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-(--ink-soft)">{workflow.labels.logged}</p>
							<p className="mt-1 font-semibold text-(--ink)">{formatMinutes(task.total_logged_minutes)}</p>
						</div>
					</div>
				) : null}
			</div>
		</Surface>
	);
};
