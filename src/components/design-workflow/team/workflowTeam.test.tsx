import { manager, mockProfile } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderWorkflowView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { WorkflowTeam } from '@/components/design-workflow/team/workflowTeam';

it('renders the designer workload and keeps managers out of the workload directory', () => {
	mockProfile(manager);
	renderWorkflowView(WorkflowTeam, {}, { title: 'Team', variant: 'team' });
	expect(screen.getAllByText('Dina Designer').length).toBeGreaterThan(0);
	expect(screen.getAllByText('Rami Reviewer').length).toBeGreaterThan(0);
	expect(screen.queryByText('Mona Manager')).not.toBeInTheDocument();
	expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
});
it('shows no-data guidance instead of an empty workload chart', () => {
	mockProfile(manager);
	renderWorkflowView(WorkflowTeam, { designerWorkload: [] });
	expect(screen.getAllByText(en.workflow.emptyStates.noWorkloadData.title).length).toBeGreaterThan(0);
	expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
});
