'use client';

import * as Popover from '@radix-ui/react-popover';
import { X } from 'lucide-react';
import { AvatarBadge } from './workflowFields';
import { useLanguage } from '@/utils/hooks';
import type { TaskCard, WorkflowUser } from '@/types/designWorkflowTypes';

export const TaskPeople = ({ task, size = 26 }: { task: TaskCard; size?: number }) => {
	const { t } = useLanguage();
	const people = [task.current_assignee, task.project.manager, ...(task.project.collaborators ?? [])].filter(
		(user, index, list): user is WorkflowUser =>
			Boolean(user) && list.findIndex((item) => item?.id === user?.id) === index,
	);
	const extraCount = people.length - 3;
	if (people.length === 0) return null;

	return (
		<div className="workflow-task-people">
			{people.slice(0, 3).map((user) => (
				<AvatarBadge key={user.id} user={user} size={size} showTooltip />
			))}
			{extraCount > 0 ? (
				<Popover.Root>
					<Popover.Trigger asChild>
						<button
							type="button"
							data-no-card-open
							className="workflow-task-people-more workflow-focus-ring"
							style={{ width: size + 4, height: size + 4 }}
							aria-label={`${extraCount} ${t.workflow.labels.moreTaskMembers}`}
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => event.stopPropagation()}
							onKeyDown={(event) => event.stopPropagation()}
						>
							+{extraCount}
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content
							className="workflow-task-people-popover"
							aria-label={t.workflow.labels.teamMembers}
							side="top"
							align="end"
							sideOffset={8}
							collisionPadding={12}
							data-no-card-open
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => event.stopPropagation()}
							onKeyDown={(event) => event.stopPropagation()}
						>
							<div className="mb-3 flex items-center justify-between gap-3">
								<p className="text-sm font-semibold">
									{t.workflow.labels.teamMembers} · {people.length}
								</p>
								<Popover.Close className="workflow-focus-ring rounded-lg p-1.5" aria-label={t.common.close}>
									<X size={16} />
								</Popover.Close>
							</div>
							<ul className="space-y-3">
								{people.map((user) => (
									<li key={user.id} className="flex items-center gap-3">
										<AvatarBadge user={user} size={30} />
										<span className="min-w-0 text-sm wrap-anywhere">
											{`${user.first_name} ${user.last_name}`.trim() || user.email}
										</span>
									</li>
								))}
							</ul>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			) : null}
		</div>
	);
};
