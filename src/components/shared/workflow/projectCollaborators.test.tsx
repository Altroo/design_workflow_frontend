import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectCollaborators } from './projectCollaborators';
import type { WorkflowUser } from '@/types/designWorkflowTypes';

jest.mock('./workflowFormControls', () => ({
	WorkflowSelectField: ({
		id,
		value,
		options,
		disabled,
		onChangeAction,
	}: {
		id: string;
		value: string;
		options: Array<{ value: string | number; label: string }>;
		disabled: boolean;
		onChangeAction: (value: string) => void;
	}) => (
		<select id={id} value={value} disabled={disabled} onChange={(event) => onChangeAction(event.target.value)}>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	),
}));
const users = [1, 2, 3, 4].map((id) => ({
	id,
	first_name: `Member ${id}`,
	last_name: '',
	email: `${id}@example.com`,
	is_active: id !== 3,
})) as WorkflowUser[];

it('offers only active, unselected collaborators and excludes the owner', () => {
	const onChangeAction = jest.fn();
	render(
		<ProjectCollaborators id="members" ownerId={1} users={users} value={[2, 3]} onChangeAction={onChangeAction} />,
	);
	expect(screen.getAllByRole('option').map((option) => option.getAttribute('value'))).toEqual(['', '4']);
	fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
	expect(onChangeAction).toHaveBeenCalledWith([2, 3, 4]);
});

it('allows removing an inactive existing member without removing others', () => {
	const onChangeAction = jest.fn();
	render(
		<ProjectCollaborators id="members" ownerId={1} users={users} value={[2, 3]} onChangeAction={onChangeAction} />,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Retirer Member 3' }));
	expect(onChangeAction).toHaveBeenCalledWith([2]);
});
