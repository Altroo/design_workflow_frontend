import { boardTask, designerA, designerB, mockProfile } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPeople } from './taskPeople';

const originalResizeObserver = global.ResizeObserver;
beforeEach(() => mockProfile(designerA));
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

const collaborators = Array.from({ length: 6 }, (_, index) => ({
	...designerB,
	id: 100 + index,
	first_name: `Collaborator ${index + 1}`,
	avatar: index === 5 ? '/collaborator.png' : null,
}));
const sharedTask = {
	...boardTask,
	current_assignee: designerA,
	project: { ...boardTask.project, manager: designerA, collaborators },
};

it('caps a six-collaborator card at three avatars and +4, with all seven people accessible', async () => {
	const user = userEvent.setup();
	const openCard = jest.fn();
	render(
		<div onClick={openCard} onPointerDown={openCard} onKeyDown={openCard}>
			<TaskPeople task={sharedTask} size={24} />
		</div>,
	);
	expect(screen.getAllByRole('button')).toHaveLength(4);
	expect(screen.getAllByRole('button')[0]).toHaveAccessibleName(`${designerA.first_name} ${designerA.last_name}`);
	const more = screen.getByRole('button', { name: '4 more team members' });
	expect(more).toHaveTextContent('+4');
	await user.click(more);
	const list = within(await screen.findByRole('dialog', { name: 'Team members' }));
	expect(list.getAllByRole('listitem')).toHaveLength(7);
	for (const person of [designerA, ...collaborators]) {
		expect(list.getByText(`${person.first_name} ${person.last_name}`)).toBeVisible();
	}
	expect(list.getByRole('img')).toHaveAttribute('src', expect.stringContaining('/collaborator.png'));
	await user.click(list.getByText(`${collaborators[5].first_name} ${designerB.last_name}`));
	expect(openCard).not.toHaveBeenCalled();
	await user.click(list.getByRole('button', { name: 'Close' }));
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(more).toHaveFocus();
});

it('opens the overflow list with the keyboard and closes on Escape', async () => {
	const user = userEvent.setup();
	render(<TaskPeople task={sharedTask} />);
	for (let index = 0; index < 4; index++) await user.tab();
	expect(screen.getByRole('button', { name: '4 more team members' })).toHaveFocus();
	await user.keyboard('{Enter}');
	expect(await screen.findByRole('dialog', { name: 'Team members' })).toBeVisible();
	await user.keyboard('{Escape}');
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('removes the overflow button when collaborators are removed and does not count duplicate people', () => {
	const { rerender } = render(
		<TaskPeople
			task={{ ...sharedTask, project: { ...sharedTask.project, collaborators: [...collaborators, designerA] } }}
		/>,
	);
	expect(screen.getByRole('button', { name: '4 more team members' })).toBeVisible();
	rerender(
		<TaskPeople
			task={{ ...sharedTask, project: { ...sharedTask.project, collaborators: collaborators.slice(0, 2) } }}
		/>,
	);
	expect(screen.getAllByRole('button')).toHaveLength(3);
	expect(screen.queryByRole('button', { name: /more team members/ })).not.toBeInTheDocument();
});
