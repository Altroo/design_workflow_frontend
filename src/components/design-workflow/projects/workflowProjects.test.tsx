import {
	mockCreateProject,
	mockUpdateProject,
	mockCreateTask,
	mockUseGetProjectQuery,
	mockUseGetProjectsQuery,
	mockUseGetUsersListQuery,
	manager,
	designerA,
	designerB,
	projectSummary,
	projectDetail,
	mockProfile,
	selectMuiOption,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type { ProjectSummary } from '@/types/designWorkflowTypes';

it('allows a regular user to create projects and assign estimated tasks', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);

	const { rerender } = render(<DesignWorkflowShell title="Projects" variant="projects" />);
	await user.type(screen.getByLabelText('Project name'), 'Shared campaign');
	await waitFor(() => expect(screen.getByRole('button', { name: 'Create project' })).toBeEnabled());
	await user.click(screen.getByRole('button', { name: 'Create project' }));

	await waitFor(() =>
		expect(mockCreateProject).toHaveBeenCalledWith({
			name: 'Shared campaign',
			description: '',
			manager_id: designerA.id,
			collaborator_ids: [],
			start_date: null,
			target_end_date: null,
			priority: 'medium',
			status: 'planned',
			archived: false,
		}),
	);

	rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	await user.type(screen.getByLabelText('Task title'), 'Prepare shared delivery');
	await selectMuiOption(user, 'Assignee', `${designerB.first_name} ${designerB.last_name}`);
	await user.clear(screen.getByLabelText('Planned days'));
	await user.type(screen.getByLabelText('Planned days'), '2');
	await user.click(screen.getByRole('button', { name: 'Create task' }));

	await waitFor(() =>
		expect(mockCreateTask).toHaveBeenCalledWith({
			project_id: projectDetail.id,
			title: 'Prepare shared delivery',
			description: '',
			current_assignee_id: designerB.id,
			status: 'backlog',
			priority: 'medium',
			due_date: null,
			estimated_minutes: 960,
			blocked_reason: '',
			sort_order: 0,
		}),
	);
});

it('shows unassigned projects as read-only directory entries', () => {
	mockProfile(designerA);
	const readOnlyProject: ProjectSummary = {
		...projectSummary,
		id: 202,
		name: 'Assigned to another designer',
		manager: designerB,
		can_work: false,
	};
	mockUseGetProjectsQuery.mockReturnValue({
		data: [projectSummary, readOnlyProject],
		isLoading: false,
	});

	render(<DesignWorkflowShell title="Projects" variant="projects" />);

	expect(mockUseGetProjectsQuery).toHaveBeenCalledWith({ all: true }, expect.objectContaining({ skip: false }));
	const readOnlyCard = screen.getByText(readOnlyProject.name).closest('article');
	expect(readOnlyCard).not.toBeNull();
	expect(within(readOnlyCard as HTMLElement).getByText('Read only')).toBeInTheDocument();
	expect(within(readOnlyCard as HTMLElement).getByRole('link', { name: /open/i })).toHaveAttribute(
		'href',
		'/dashboard/projects/202',
	);
});

it('shows compact project counts and a meaningful project status', () => {
	mockProfile(manager);
	const { rerender, container } = render(<DesignWorkflowShell title="Projects" variant="projects" />);
	const summary = container.querySelector('.workflow-projects-header .workflow-header-summary') as HTMLElement;
	expect(summary.querySelectorAll('.workflow-header-stat')).toHaveLength(3);
	expect(within(summary).getByText('Open tasks')).toBeInTheDocument();
	expect(container.querySelector('.workflow-projects-actions')).toBeNull();
	mockUseGetProjectQuery.mockReturnValue({ data: { ...projectDetail, open_tasks_count: 1 }, isLoading: false });
	rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	const header = container.querySelector('.workflow-project-detail-header') as HTMLElement;
	expect(within(header).getByText('open task')).toBeInTheDocument();
	expect(within(header).queryByText('Workflow')).not.toBeInTheDocument();
	expect(header.querySelector('.workflow-project-detail-status')).toHaveAttribute('data-status', projectDetail.status);
});

it('adds multiple collaborators and removes only the selected member', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	render(<DesignWorkflowShell title="Projects" variant="projects" />);
	await user.type(screen.getByLabelText('Project name'), 'Shared studio');
	await selectMuiOption(user, 'Collaborators', 'Dina Designer');
	await selectMuiOption(user, 'Collaborators', 'Rami Reviewer');
	await user.click(screen.getByRole('button', { name: 'Remove Dina Designer' }));
	expect(screen.getByRole('button', { name: 'Remove Rami Reviewer' })).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Create project' }));
	await waitFor(() =>
		expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({ collaborator_ids: [designerB.id] })),
	);
});

it('excludes inactive collaborator choices but keeps existing inactive members removable', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	const inactiveDesigner = { ...designerA, is_active: false };
	mockUseGetUsersListQuery.mockReturnValue({
		data: { results: [manager, inactiveDesigner, designerB] },
		isLoading: false,
	});
	const { rerender } = render(<DesignWorkflowShell title="Projects" variant="projects" />);
	await user.click(screen.getByRole('combobox', { name: 'Collaborators' }));
	const choices = await screen.findByRole('listbox');
	expect(within(choices).queryByRole('option', { name: 'Dina Designer' })).not.toBeInTheDocument();
	await user.click(within(choices).getByRole('option', { name: 'Rami Reviewer' }));
	await user.type(screen.getByLabelText('Project name'), 'Active team');
	await user.click(screen.getByRole('button', { name: 'Create project' }));
	await waitFor(() =>
		expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({ collaborator_ids: [designerB.id] })),
	);

	mockUseGetProjectQuery.mockReturnValue({
		data: { ...projectDetail, collaborators: [inactiveDesigner] },
		isLoading: false,
	});
	rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	await user.click(await screen.findByRole('button', { name: 'Remove Dina Designer' }));
	await user.click(screen.getByRole('button', { name: 'Update project' }));
	await waitFor(() =>
		expect(mockUpdateProject).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ collaborator_ids: [] }) }),
		),
	);
});
