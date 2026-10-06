'use client';
import { AvatarBadge, HistoryPager, Surface } from '@/components/shared/workflow/workflowFields';
import type { TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
export const TaskActivityPanel = ({
	model,
}: {
	model: Pick<
		TaskDetailModel,
		| 'workflow'
		| 'pagedTaskActivity'
		| 'describeWorkflowActivity'
		| 'dateTimeFor'
		| 'taskActivityPage'
		| 'taskActivityTotalPages'
		| 'setTaskActivityPage'
	>;
}) => {
	const {
		workflow,
		pagedTaskActivity,
		describeWorkflowActivity,
		dateTimeFor,
		taskActivityPage,
		taskActivityTotalPages,
		setTaskActivityPage,
	} = model;
	return (
		<Surface className="workflow-task-detail-panel workflow-task-activity-panel" {...workflow.sections.activity}>
			<div className="workflow-task-activity-list">
				{pagedTaskActivity.map((activity) => (
					<div key={activity.id} className="app-card-muted p-4">
						<div className="flex items-start gap-3">
							{activity.actor ? (
								<AvatarBadge user={activity.actor} size={34} />
							) : (
								<div className="grid h-8.5 w-8.5 place-items-center rounded-full bg-(--surface-strong) text-xs font-bold text-(--ink)">
									DW
								</div>
							)}
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-(--ink)">
									{activity.actor ? `${activity.actor.first_name} ${activity.actor.last_name}` : workflow.labels.system}
								</p>
								<p className="mt-2 text-sm leading-6 text-(--ink-soft)">{describeWorkflowActivity(activity)}</p>
								<p className="mt-3 text-xs uppercase tracking-[0.14em] text-(--ink-soft)">
									{dateTimeFor(activity.created_at)}
								</p>
							</div>
						</div>
					</div>
				))}
				<HistoryPager
					page={taskActivityPage}
					totalPages={taskActivityTotalPages}
					onChangeAction={setTaskActivityPage}
				/>
			</div>
		</Surface>
	);
};
