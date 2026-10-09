import {
	mockCreateTask,
	mockUseGetProjectsQuery,
	mockUseGetLabelsQuery,
	mockUseGetSavedViewsQuery,
	mockUseGetTasksQuery,
	manager,
	designerA,
	projectSummary,
	mockProfile,
	selectMuiOption,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import type { ProjectSummary, SavedView } from '@/types/designWorkflowTypes';

it.each(['All projects', 'My projects'])('requires an explicit project when quick-adding from %s', async (filter) => {
	const user = userEvent.setup();
	mockProfile(manager);
	const secondProject: ProjectSummary = {
		...projectSummary,
		id: 202,
		name: 'Retail launch',
	};
	mockUseGetProjectsQuery.mockReturnValue({ data: [projectSummary, secondProject], isLoading: false });

	render(<DesignWorkflowShell title="Board" variant="board" />);
	await selectMuiOption(user, 'Project', filter);
	await waitFor(() =>
		expect(mockUseGetTasksQuery).toHaveBeenCalledWith(
			expect.objectContaining({ my_projects: filter === 'My projects' || undefined, project: undefined }),
			expect.objectContaining({ skip: false }),
		),
	);

	await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
	const quickAdd = document.querySelector('.workflow-quick-add-card');
	expect(quickAdd).not.toBeNull();
	const addButton = within(quickAdd as HTMLElement).getByRole('button', { name: 'Add' });
	expect(addButton).toBeDisabled();
	const projectChoice = within(quickAdd as HTMLElement).getByRole('combobox', { name: 'Card project' });
	expect(projectChoice).toHaveFocus();
	expect(
		projectChoice.compareDocumentPosition(within(quickAdd as HTMLElement).getByLabelText('Task title')) &
			Node.DOCUMENT_POSITION_FOLLOWING,
	).toBeTruthy();
	await user.type(within(quickAdd as HTMLElement).getByPlaceholderText('Enter a title or paste a link'), 'Launch card');
	expect(addButton).toBeDisabled();
	await user.keyboard('{Enter}');
	expect(mockCreateTask).not.toHaveBeenCalled();
	await selectMuiOption(user, 'Card project', secondProject.name, quickAdd as HTMLElement);
	expect(addButton).toBeEnabled();
	await user.click(addButton);

	await waitFor(() =>
		expect(mockCreateTask).toHaveBeenCalledWith(
			expect.objectContaining({ project_id: secondProject.id, title: 'Launch card' }),
		),
	);
});

it.each([false, true])(
	'shows the destination project when only one choice is available (filtered=%s)',
	async (filtered) => {
		const user = userEvent.setup();
		mockProfile(designerA);
		const secondProject = { ...projectSummary, id: 202, name: 'Other editable project' };
		mockUseGetProjectsQuery.mockReturnValue({
			data: filtered ? [projectSummary, secondProject] : [projectSummary],
			isLoading: false,
		});
		render(<DesignWorkflowShell title="Board" variant="board" />);
		if (filtered) await selectMuiOption(user, 'Project', projectSummary.name);
		await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
		const form = document.querySelector('.workflow-quick-add-card') as HTMLElement;
		expect(within(form).getByText('Card project')).toBeInTheDocument();
		expect(within(form).getByRole('combobox', { name: 'Card project' })).toHaveValue(projectSummary.name);
		await user.type(within(form).getByLabelText('Task title'), 'Clearly assigned{Enter}');
		await waitFor(() =>
			expect(mockCreateTask).toHaveBeenCalledWith(
				expect.objectContaining({ project_id: projectSummary.id, title: 'Clearly assigned' }),
			),
		);
	},
);

it.each(['empty', 'read-only', 'archived'])('keeps creation visible but disabled with %s projects', async (kind) => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUseGetProjectsQuery.mockReturnValue({
		data:
			kind === 'empty' ? [] : [{ ...projectSummary, can_work: kind !== 'read-only', archived: kind === 'archived' }],
		isLoading: false,
	});
	render(<DesignWorkflowShell title="Board" variant="board" />);
	for (const button of screen.getAllByRole('button', { name: 'Add a card' })) expect(button).toBeDisabled();
	await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
	expect(document.querySelector('.workflow-quick-add-card')).toBeNull();
	expect(mockCreateTask).not.toHaveBeenCalled();
});

it('lists only writable active projects and never substitutes another project after access is lost', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const secondProject = { ...projectSummary, id: 202, name: 'Other editable project' };
	const readOnly = { ...projectSummary, id: 203, name: 'Read only project', can_work: false };
	const archived = { ...projectSummary, id: 204, name: 'Archived project', archived: true };
	mockUseGetProjectsQuery.mockReturnValue({
		data: [projectSummary, secondProject, readOnly, archived],
		isLoading: false,
	});
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
	const form = document.querySelector('.workflow-quick-add-card') as HTMLElement;
	await user.click(within(form).getByRole('combobox', { name: 'Card project' }));
	const options = screen.getByRole('listbox');
	expect(within(options).queryByRole('option', { name: readOnly.name })).not.toBeInTheDocument();
	expect(within(options).queryByRole('option', { name: archived.name })).not.toBeInTheDocument();
	await user.click(within(options).getByRole('option', { name: projectSummary.name }));
	await user.type(within(form).getByLabelText('Task title'), 'Do not redirect');
	mockUseGetProjectsQuery.mockReturnValue({
		data: [{ ...projectSummary, can_work: false }, secondProject],
		isLoading: false,
	});
	await act(async () => {
		rerender(<DesignWorkflowShell title="Board" variant="board" />);
	});
	expect(within(form).getByRole('button', { name: 'Add' })).toBeDisabled();
	await user.click(within(form).getByLabelText('Task title'));
	await user.keyboard('{Enter}');
	expect(mockCreateTask).not.toHaveBeenCalled();
	await selectMuiOption(user, 'Card project', secondProject.name, form);
	await user.click(within(form).getByRole('button', { name: 'Add' }));
	await waitFor(() =>
		expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ project_id: secondProject.id })),
	);
});

it('resets creation context when the project filter changes and blocks a read-only selected project', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const other = { ...projectSummary, id: 202, name: 'Other project', can_work: false };
	mockUseGetProjectsQuery.mockReturnValue({ data: [projectSummary, other], isLoading: false });
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
	await user.type(screen.getByLabelText('Task title'), 'Old draft');
	await selectMuiOption(user, 'Project', other.name);
	expect(document.querySelector('.workflow-quick-add-card')).toBeNull();
	for (const button of screen.getAllByRole('button', { name: 'Add a card' })) expect(button).toBeDisabled();
	await selectMuiOption(user, 'Project', projectSummary.name);
	await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
	expect(screen.getByLabelText('Task title')).toHaveValue('');
	expect(mockCreateTask).not.toHaveBeenCalled();
});

it('retains the project and title after a create error, prevents duplicate requests and leaves cancelled forms closed', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	let finish: () => void = () => {};
	const pending = new Promise<void>((resolve) => {
		finish = resolve;
	});
	mockCreateTask
		.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 500 }) })
		.mockReturnValue({ unwrap: () => pending });
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
	const form = document.querySelector('.workflow-quick-add-card') as HTMLElement;
	await user.type(within(form).getByLabelText('Task title'), 'Retry in same project{Enter}');
	await waitFor(() => expect(mockCreateTask).toHaveBeenCalledTimes(1));
	expect(within(form).getByLabelText('Task title')).toHaveValue('Retry in same project');
	expect(within(form).getByRole('combobox', { name: 'Card project' })).toHaveValue(projectSummary.name);
	await user.keyboard('{Enter}{Enter}');
	expect(mockCreateTask).toHaveBeenCalledTimes(2);
	await user.click(within(form).getByRole('button', { name: 'Cancel' }));
	await act(async () => {
		finish();
		await pending;
	});
	expect(document.querySelector('.workflow-quick-add-card')).toBeNull();
});

it('shows the complete read-only explanation for another project', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	const readOnlyProject = { ...projectSummary, id: 202, name: 'Other studio', can_work: false };
	mockUseGetProjectsQuery.mockReturnValue({
		data: [{ ...projectSummary, can_work: true }, readOnlyProject],
		isLoading: false,
	});
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await selectMuiOption(user, 'Project', readOnlyProject.name);
	const notice = document.querySelector('.workflow-board-view-notice') as HTMLElement;
	expect(notice).toHaveAttribute('role', 'status');
	expect(within(notice).getByText('Read-only project')).toBeInTheDocument();
	expect(
		within(notice).getByText('You can view every card. Only tasks assigned to you can be edited or moved.'),
	).toBeInTheDocument();
});

it('filters the board with one of the current user labels', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	const ownLabel = {
		id: 41,
		name: 'Beta review',
		color: '#6366f1',
		created_by: manager,
		created_at: '2026-04-20T08:00:00Z',
		updated_at: '2026-04-20T08:00:00Z',
	};
	mockUseGetLabelsQuery.mockReturnValue({ data: [ownLabel] });

	render(<DesignWorkflowShell title="Board" variant="board" />);
	await selectMuiOption(user, 'Label', ownLabel.name);

	await waitFor(() =>
		expect(mockUseGetTasksQuery).toHaveBeenCalledWith(
			expect.objectContaining({ label: ownLabel.id }),
			expect.objectContaining({ skip: false }),
		),
	);
});

it('clears saved-view filters when switching back to the unsaved default', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUseGetSavedViewsQuery.mockReturnValue({
		data: [
			{
				id: 88,
				name: 'Beta review',
				owner: manager,
				visibility: 'private',
				filters: { q: 'palette' },
				sort: { field: 'due_date' },
				density: 'compact',
				collapsed_lanes: [],
				show_archived: false,
				is_default: false,
				created_at: '2026-04-20T08:00:00Z',
				updated_at: '2026-04-20T08:00:00Z',
			},
		],
	});

	render(<DesignWorkflowShell title="Board" variant="board" />);
	const savedViewBar = document.querySelector('.workflow-saved-view-bar');
	expect(savedViewBar).not.toBeNull();
	const savedViewSelect = within(savedViewBar as HTMLElement).getAllByRole('combobox')[0];

	await user.click(savedViewSelect);
	await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Beta review' }));
	expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('palette');

	await user.click(savedViewSelect);
	await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Saved views' }));
	expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('');
});

it('updates selected saved-view filters live and clears them when the view is removed', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	const view: SavedView = {
		id: 88,
		name: 'Shared review',
		owner: manager,
		visibility: 'private',
		filters: { q: 'palette' },
		sort: { field: 'due_date' },
		density: 'compact',
		collapsed_lanes: [],
		show_archived: false,
		is_default: false,
		created_at: '2026-04-20T08:00:00Z',
		updated_at: '2026-04-20T08:00:00Z',
	};
	mockUseGetSavedViewsQuery.mockReturnValue({ data: [view] });
	const { rerender } = render(<DesignWorkflowShell title="Board" variant="board" />);
	const viewSelect = within(document.querySelector('.workflow-saved-view-bar') as HTMLElement).getAllByRole(
		'combobox',
	)[0];
	await user.click(viewSelect);
	await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: view.name }));
	expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('palette');
	mockUseGetSavedViewsQuery.mockReturnValue({
		data: [{ ...view, filters: { q: 'updated filter', priority: 'high' } }],
	});
	mockUseGetTasksQuery.mockClear();
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('updated filter');
	expect(mockUseGetTasksQuery).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' }), { skip: false });
	mockUseGetSavedViewsQuery.mockReturnValue({ data: [] });
	mockUseGetTasksQuery.mockClear();
	rerender(<DesignWorkflowShell title="Board" variant="board" />);
	expect(screen.getByPlaceholderText('Task, project, description')).toHaveValue('');
	expect(mockUseGetTasksQuery).toHaveBeenCalledWith(expect.objectContaining({ priority: undefined }), {
		skip: false,
	});
});
