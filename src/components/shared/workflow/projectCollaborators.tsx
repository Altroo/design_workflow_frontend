'use client';

import { Users, X } from 'lucide-react';
import type { WorkflowUser } from '@/types/designWorkflowTypes';
import { useLanguage } from '@/utils/hooks';
import { WorkflowAvatar } from './workflowAvatar';
import { WorkflowSelectField } from './workflowFormControls';

export const ProjectCollaborators = ({ id, users, ownerId, value, onChange }: {
	id: string;
	users: WorkflowUser[];
	ownerId: number;
	value: number[];
	onChange: (ids: number[]) => void;
}) => {
	const { language } = useLanguage();
	const french = language === 'fr';
	const selected = users.filter(user => value.includes(user.id) && user.id !== ownerId);
	const available = users.filter(user => user.is_active !== false && user.id !== ownerId && !value.includes(user.id));
	const nameFor = (user: WorkflowUser) => `${user.first_name} ${user.last_name}`.trim() || user.email;
	return <div className="workflow-project-collaborators md:col-span-2">
		<label htmlFor={id} className="mb-2 block text-sm text-(--ink-soft)">{french ? 'Collaborateurs' : 'Collaborators'}</label>
		<WorkflowSelectField id={id} value="" startIcon={<Users size={18} />} onChange={next => {
			if (next) onChange([...value.filter(memberId => memberId !== ownerId), Number(next)]);
		}} options={[
			{ value: '', label: french ? 'Ajouter un collaborateur' : 'Add a collaborator' },
			...available.map(user => ({ value: user.id, label: nameFor(user) })),
		]} disabled={!available.length} />
		{selected.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">
			{selected.map(user => <li key={user.id} className="workflow-project-member">
				<WorkflowAvatar user={user} size={26} />
				<span>{nameFor(user)}</span>
				<button type="button" aria-label={`${french ? 'Retirer' : 'Remove'} ${nameFor(user)}`} onClick={() => onChange(value.filter(memberId => memberId !== user.id))}>
					<X size={14} />
				</button>
			</li>)}
		</ul>}
		<p className="mt-2 text-xs leading-5 text-(--ink-muted)">{french
			? 'Ils peuvent créer, modifier et déplacer toutes les tâches du projet, ainsi que participer au chat.'
			: 'They can create, edit and move all tasks in the project, and participate in its chat.'}</p>
	</div>;
};
