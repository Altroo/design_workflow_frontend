import { peer, message, emit } from '@/components/design-workflow/__testutils__/chatTestSetup';
import { render, screen } from '@testing-library/react';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';

it('opens the incoming conversation accordion without switching the active conversation', () => {
	render(<DesignWorkflowChat />);
	const directAccordion = document.querySelector<HTMLButtonElement>(
		'button[aria-controls="workflow-chat-direct-list"]',
	);
	expect(directAccordion).toHaveAttribute('aria-expanded', 'false');
	emit({ type: 'chat.message', message: { ...message(202, 'Private incoming', 20), sender: peer } });
	expect(directAccordion).toHaveAttribute('aria-expanded', 'true');
	expect(screen.getByText('Latest public one')).toBeInTheDocument();
	expect(screen.queryByText('Latest private one')).not.toBeInTheDocument();
});
