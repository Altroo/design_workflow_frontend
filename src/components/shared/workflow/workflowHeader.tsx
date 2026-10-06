'use client';

import { Chip, Surface } from '@/components/shared/workflow/workflowFields';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';

export const WorkflowHeader = ({
	model,
}: {
	model: Pick<WorkflowController, 'workflow' | 'pageHeading' | 'variant' | 'pageHighlights'>;
}) => {
	const { workflow, pageHeading, variant, pageHighlights } = model;
	return (
		<Surface className="workflow-hero">
			<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--ink-muted)">
						{workflow.labels.workflow}
					</p>
					<h1 className="mt-3 text-3xl font-semibold text-(--ink) sm:text-4xl">{pageHeading}</h1>
					<p className="mt-3 max-w-2xl text-sm leading-6 text-(--ink-soft)">{workflow.pageDescriptions[variant]}</p>
				</div>
				<div className="rounded-2xl border border-(--line) bg-(--surface-muted) p-3">
					<div className="flex flex-wrap gap-2">
						{pageHighlights.map((item) => (
							<Chip key={item} tone="neutral">
								{item}
							</Chip>
						))}
					</div>
				</div>
			</div>
		</Surface>
	);
};
