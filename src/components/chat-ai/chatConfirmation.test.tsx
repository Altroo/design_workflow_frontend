import { fireEvent, render, screen } from '@testing-library/react';
import { ChatConfirmation } from './chatConfirmation';
import { fr } from '@/translations/fr';
jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: fr, language: 'fr' }) }));
it('uses the existing confirmation modal and labels exact before/after values', () => {
	const confirm = jest.fn();
	render(
		<ChatConfirmation
			busy={false}
			error=""
			onClose={jest.fn()}
			onConfirm={confirm}
			card={{
				type: 'confirmation',
				action_id: 'id',
				resource: 'task',
				record_id: 1,
				operation: 'update',
				label: 'Moodboard',
				before: { priority: 'low' },
				changes: { priority: 'high' },
				running_tasks: 0,
				expires_at: '',
			}}
		/>,
	);
	expect(screen.getByRole('dialog')).toBeInTheDocument();
	expect(screen.getByText('Basse')).toBeInTheDocument();
	expect(screen.getByText('Haute')).toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
	expect(confirm).toHaveBeenCalledTimes(1);
});
