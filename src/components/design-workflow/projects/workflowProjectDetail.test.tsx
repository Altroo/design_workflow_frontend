import {
	mockOnError,
	mockUpdateProject,
	mockUpdateTask,
	mockUseGetProjectQuery,
	mockUseGetTaskQuery,
	manager,
	designerA,
	designerB,
	boardTask,
	projectDetail,
	taskDetail,
	mockProfile,
	selectMuiOption,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type { ProjectDetail } from '@/types/designWorkflowTypes';

it('edits a project task in a focused modal and opens the full preview on demand', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);

	await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
	const editDialog = await screen.findByRole('dialog', { name: 'Edit task' });
	expect(within(editDialog).getByLabelText('Task title')).toHaveValue(taskDetail.title);
	expect(within(editDialog).getByLabelText('Description')).toHaveValue(taskDetail.description);

	await user.clear(within(editDialog).getByLabelText('Task title'));
	await user.type(within(editDialog).getByLabelText('Task title'), 'Finalize approved material board');
	await selectMuiOption(user, 'Status', 'In Progress', editDialog);
	await selectMuiOption(user, 'Priority', 'High', editDialog);
	await user.clear(within(editDialog).getByLabelText('Planned days'));
	await user.type(within(editDialog).getByLabelText('Planned days'), '2');
	await user.click(within(editDialog).getByRole('button', { name: 'Save' }));

	await waitFor(() =>
		expect(mockUpdateTask).toHaveBeenCalledWith({
			id: taskDetail.id,
			data: {
				title: 'Finalize approved material board',
				status: 'in_progress',
				priority: 'high',
				estimated_minutes: 960,
				expected_values: {
					title: taskDetail.title,
					status: taskDetail.status,
					priority: taskDetail.priority,
					estimated_minutes: taskDetail.estimated_minutes,
				},
			},
		}),
	);
	expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();

	await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
	await user.click(
		within(await screen.findByRole('dialog', { name: 'Edit task' })).getByRole('button', { name: 'Preview' }),
	);
	expect(await screen.findByRole('dialog', { name: taskDetail.title })).toBeInTheDocument();
});

it('lets a collaborator create tasks without managing project settings', () => {
	mockProfile(designerA);
	mockUseGetProjectQuery.mockReturnValue({
		data: { ...projectDetail, can_work: true, can_manage: false, collaborators: [designerA, designerB] },
		isLoading: false,
	});
	render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	expect(document.querySelector('.workflow-project-detail-create')).not.toBeNull();
	expect(document.querySelector('.workflow-project-detail-edit')).toBeNull();
	expect(screen.queryByRole('button', { name: 'Archive project' })).not.toBeInTheDocument();
});

it('opens another owner project tasks in read-only mode', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	const readOnlyTask = { ...boardTask, can_edit: false };
	const readOnlyProject: ProjectDetail = {
		...projectDetail,
		manager,
		can_work: false,
		tasks: [readOnlyTask],
	};
	mockUseGetProjectQuery.mockReturnValue({ data: readOnlyProject, isLoading: false });
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, can_edit: false }, isLoading: false });

	render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={readOnlyProject.id} />);

	expect(document.querySelector('.workflow-project-detail-create')).toBeNull();
	await user.click(screen.getByRole('button', { name: new RegExp(boardTask.title, 'i') }));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	expect(within(dialog).getByText(boardTask.description)).toBeInTheDocument();
	expect(within(dialog).queryByRole('button', { name: 'Labels' })).not.toBeInTheDocument();
});

it('confirms project archiving with the running task count', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);

	await user.click(screen.getByRole('button', { name: 'Archive project' }));
	const dialog = screen.getByRole('dialog', { name: 'Archive this project?' });
	expect(within(dialog).getByText('2 running tasks')).toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'Archive project' }));
	await waitFor(() =>
		expect(mockUpdateProject).toHaveBeenCalledWith({ id: projectDetail.id, data: { archived: true } }),
	);
});

it('guards a dirty task field against a concurrent update without overwriting clean fields', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	const { rerender } = render(
		<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />,
	);
	await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
	const dialog = await screen.findByRole('dialog', { name: 'Edit task' });
	await user.clear(within(dialog).getByLabelText('Task title'));
	await user.type(within(dialog).getByLabelText('Task title'), 'My unfinished title');
	mockUseGetTaskQuery.mockReturnValue({
		data: { ...taskDetail, title: 'Their title', description: 'Fresh description' },
		isLoading: false,
	});
	rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	expect(within(dialog).getByLabelText('Task title')).toHaveValue('My unfinished title');
	expect(within(dialog).getByLabelText('Description')).toHaveValue('Fresh description');
	expect(within(dialog).getByRole('alert')).toHaveTextContent('Someone else changed this task');
	await user.click(within(dialog).getByRole('button', { name: 'Save' }));
	expect(mockUpdateTask).toHaveBeenCalledWith({
		id: taskDetail.id,
		data: {
			title: 'My unfinished title',
			expected_values: { title: taskDetail.title },
		},
	});
});

it('turns an open project task editor into a read-only preview when access is revoked', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const { rerender } = render(
		<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />,
	);
	await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
	expect(await screen.findByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, can_edit: false }, isLoading: false });
	rerender(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();
	const preview = await screen.findByRole('dialog', { name: taskDetail.title });
	expect(within(preview).getByText(taskDetail.description)).toBeInTheDocument();
	expect(within(preview).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
	expect(within(preview).queryByRole('button', { name: 'Members' })).not.toBeInTheDocument();
	expect(mockUpdateTask).not.toHaveBeenCalled();
});

it.each([
	{ detail: 'Changed elsewhere. Reload before saving.' },
	{ title: ['Changed elsewhere. Reload before saving.'] },
	{ task: { title: ['Changed elsewhere. Reload before saving.'] } },
	'Changed elsewhere. Reload before saving.',
])('keeps a rejected edit and displays structured conflict errors safely (%j)', async (details) => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUpdateTask.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { details } }) });
	render(<DesignWorkflowShell title="Project" variant="project-detail" projectId={projectDetail.id} />);
	await user.click(screen.getByRole('button', { name: /Finalize material board/ }));
	const dialog = await screen.findByRole('dialog', { name: 'Edit task' });
	await user.type(within(dialog).getByLabelText('Task title'), ' my draft');
	await user.click(within(dialog).getByRole('button', { name: 'Save' }));
	await waitFor(() =>
		expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('Changed elsewhere. Reload before saving.')),
	);
	expect(within(dialog).getByLabelText('Task title')).toHaveValue(`${taskDetail.title} my draft`);
});
