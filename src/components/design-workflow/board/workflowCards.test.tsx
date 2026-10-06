import {
	mockUseGetTaskQuery,
	mockUseGetTasksQuery,
	designerB,
	designerA,
	manager,
	boardTask,
	taskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import { BoardTaskCard, TaskCardItem } from './workflowCards';
import { TaskPeople } from '@/components/shared/workflow/taskPeople';
import { en } from '@/translations/en';

const originalResizeObserver = global.ResizeObserver;

it.each(['board', 'default'] as const)('loads the saved thumbnail lazily on %s cards', (variant) => {
	mockProfile(designerA);
	const imageTask = { ...boardTask, cover_image_url: '/media/design_workflow/task_covers/2026/10/thumb_preview.webp' };
	render(
		<TaskCardItem
			task={imageTask}
			variant={variant}
			copy={en.workflow}
			labelForAction={(value) => value}
			dateForAction={() => ''}
		/>,
	);
	const image = screen.getByRole('img', { name: imageTask.title });
	expect(image).toHaveAttribute('src', expect.stringContaining('thumb_preview.webp'));
	expect(image).toHaveAttribute('loading', 'lazy');
});
beforeAll(() => {
	global.ResizeObserver = class {
		observe = jest.fn();
		unobserve = jest.fn();
		disconnect = jest.fn();
	};
});
afterAll(() => {
	global.ResizeObserver = originalResizeObserver;
});

it('keeps unassigned cards visible but removes their edit and drag controls', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	const readOnlyTask = { ...boardTask, can_edit: false };
	mockUseGetTasksQuery.mockReturnValue({ data: [readOnlyTask], isLoading: false });
	mockUseGetTaskQuery.mockReturnValue({ data: { ...taskDetail, can_edit: false }, isLoading: false });

	render(<DesignWorkflowShell title="Board" variant="board" />);

	expect(document.querySelector('.workflow-board-drag-handle')).toBeNull();
	await user.click(screen.getByText(boardTask.title));
	const dialog = await screen.findByRole('dialog', { name: boardTask.title });
	expect(within(dialog).queryByRole('button', { name: 'Labels' })).not.toBeInTheDocument();
	expect(within(dialog).queryByPlaceholderText('Write a comment…')).not.toBeInTheDocument();
});

it.each(['board', 'default'] as const)('shows each teammate once on %s cards, with the assignee first', (variant) => {
	const collaborator = { ...designerB, avatar: '/collaborator-avatar.png' };
	const task = {
		...boardTask,
		project: { ...boardTask.project, collaborators: [designerA, collaborator, manager, collaborator] },
	};
	const { container } = render(
		<TaskCardItem
			task={task}
			copy={en.workflow}
			labelForAction={(value) => value}
			dateForAction={() => ''}
			variant={variant}
		/>,
	);
	const avatars = within(container.querySelector('.workflow-task-people') as HTMLElement);
	expect(avatars.getAllByRole('button').map((avatar) => avatar.getAttribute('aria-label'))).toEqual(
		[designerA, manager, designerB].map((user) => `${user.first_name} ${user.last_name}`),
	);
	expect(avatars.getByRole('img', { name: `${designerB.first_name} ${designerB.last_name}` })).toHaveAttribute(
		'src',
		expect.stringContaining('/collaborator-avatar.png'),
	);
	expect(avatars.getByRole('button', { name: `${designerA.first_name} ${designerA.last_name}` })).toHaveTextContent(
		`${designerA.first_name[0]}${designerA.last_name[0]}`,
	);
});

it('updates collaborator avatars when project membership changes, including unassigned cards', () => {
	const task = { ...boardTask, current_assignee: null };
	const { rerender } = render(<TaskPeople task={task} />);
	const name = `${designerB.first_name} ${designerB.last_name}`;
	expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
	rerender(<TaskPeople task={{ ...task, project: { ...task.project, collaborators: [designerB] } }} />);
	expect(screen.getByRole('button', { name })).toBeVisible();
	rerender(<TaskPeople task={{ ...task, project: { ...task.project, collaborators: [] } }} />);
	expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
});

it('shows a collaborator name on hover, tap and keyboard focus without opening the card', async () => {
	const user = userEvent.setup();
	const open = jest.fn();
	render(
		<BoardTaskCard
			task={{ ...boardTask, project: { ...boardTask.project, collaborators: [designerB] } }}
			copy={en.workflow}
			labelForAction={(value) => value}
			dateForAction={() => ''}
			onOpenAction={open}
			canDrag
		/>,
	);
	const name = `${designerB.first_name} ${designerB.last_name}`;
	const avatar = screen.getByRole('button', { name });
	await user.hover(avatar);
	expect(await screen.findByRole('tooltip')).toHaveTextContent(name);
	await user.click(avatar);
	await user.keyboard('{Enter}');
	expect(screen.getByRole('tooltip')).toHaveTextContent(name);
	expect(open).not.toHaveBeenCalled();
	await user.click(screen.getByText(boardTask.title));
	expect(open).toHaveBeenCalledWith(boardTask.id);
});
