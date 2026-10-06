import { designerA, mockProfile, taskDetail } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderWorkflowView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { WorkflowTaskDetail } from '@/components/design-workflow/task/workflowTaskDetail';

it.each([
	{ taskBusy: true, task: undefined, title: en.workflow.emptyStates.loadingTask.title },
	{ taskBusy: false, task: undefined, title: en.workflow.emptyStates.missingTask.title },
])('shows $title before rendering task controls', ({ title, ...overrides }) => {
	mockProfile(designerA);
	renderWorkflowView(WorkflowTaskDetail, overrides);
	expect(screen.getByText(title)).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
});
it('uses the card layout for a selected task', () => {
	mockProfile(designerA);
	renderWorkflowView(WorkflowTaskDetail, { task: taskDetail, selectedTaskId: taskDetail.id, taskMutable: true });
	expect(screen.getByRole('heading', { name: taskDetail.title })).toHaveAttribute('id', 'workflow-task-dialog-title');
	expect(screen.getByRole('button', { name: 'Attachments' })).toBeInTheDocument();
});
