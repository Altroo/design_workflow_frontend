import { fireEvent, render, screen } from '@testing-library/react';
import { ChatResults } from './chatResults';
import { fr } from '@/translations/fr';
import type { ChatNavigation } from '@/types/chatAiTypes';
jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: fr, language: 'fr' }) }));
const target: ChatNavigation = {
	application: 'design_workflow',
	company_id: 1,
	resource: 'task',
	identifier: 1,
	href: '/dashboard/tasks/1',
};
const actions = { onNavigate: jest.fn(), onConfirm: jest.fn(), onArchive: jest.fn(), busy: false };

it('shows read-only cards without archive actions and never renders record text as HTML', () => {
	render(
		<ChatResults
			{...actions}
			card={{
				type: 'record_list',
				resource: 'task',
				items: [
					{
						id: 1,
						name: 'Moodboard',
						description: '<strong>Not markup</strong>',
						status: 'in_progress',
						can_edit: false,
						navigation: target,
					},
				],
			}}
		/>,
	);
	expect(screen.queryByRole('button', { name: 'Archiver' })).not.toBeInTheDocument();
	expect(screen.getByText('En cours')).toBeInTheDocument();
	expect(screen.getByText('<strong>Not markup</strong>').tagName).toBe('P');
	fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
	expect(actions.onNavigate).toHaveBeenCalledWith(target);
});
it('shows native person-time as 8-hour working days with an explanation', () => {
	render(
		<ChatResults
			{...actions}
			card={{ type: 'time_report', minutes: 960, project: 'Atlas', date_from: null, date_to: null, navigation: target }}
		/>,
	);
	expect(screen.getByText('16 heures')).toBeInTheDocument();
	expect(screen.getByText(fr.chatAi.timeBasis)).toBeInTheDocument();
	expect(screen.getByText('jours de travail').parentElement).toHaveTextContent('2 jours de travail');
});
it('requires review of a confirmation card before invoking the change', () => {
	const card = {
		type: 'confirmation' as const,
		action_id: 'id',
		resource: 'task' as const,
		record_id: 1,
		operation: 'update' as const,
		label: 'Moodboard',
		changes: { title: 'New' },
		before: { title: 'Old' },
		running_tasks: 0,
		expires_at: '',
	};
	render(<ChatResults {...actions} card={card} />);
	fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
	expect(actions.onConfirm).toHaveBeenCalledWith(card);
});
