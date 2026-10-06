'use client';
import { Search } from 'lucide-react';
import Link from 'next/link';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
import { renderSearchResultIcon } from '@/components/design-workflow/search/workflowSearchResultIcon';
export const WorkflowWorkspaceSearchResults = ({
	model,
}: {
	model: Pick<WorkflowController, 'boardFilters' | 'workflow' | 'workspaceSearchResults' | 'labelFor'>;
}) => {
	const { boardFilters, workflow, workspaceSearchResults, labelFor } = model;
	if (boardFilters.search.trim().length < 2) return null;
	return (
		<div className="workflow-workspace-search-results">
			<div className="workflow-workspace-search-head">
				<span>
					<Search size={15} />
					{workflow.labels.workspaceSearch ?? 'Workspace search'}
				</span>
				<strong>{workspaceSearchResults.length}</strong>
			</div>
			{workspaceSearchResults.slice(0, 8).map((result) => (
				<Link
					key={`${result.type}-${result.id}-${result.url}`}
					href={result.url}
					className="workflow-workspace-search-item"
				>
					<span className="workflow-workspace-search-icon">{renderSearchResultIcon(result)}</span>
					<span className="min-w-0">
						<b>{result.title || (workflow.labels.untitled ?? 'Untitled')}</b>
						<small>
							{labelFor(result.type)} - {result.subtitle}
						</small>
					</span>
				</Link>
			))}
			{workspaceSearchResults.length === 0 ? (
				<p className="workflow-workspace-search-empty">{workflow.labels.noSearchResults ?? 'No results found.'}</p>
			) : null}
		</div>
	);
};
