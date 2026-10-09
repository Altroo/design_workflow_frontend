import { fireEvent, render, screen } from '@testing-library/react';
import { chatAiEn, chatAiFr } from '@/translations/chatAi';
import { ChatShortcuts } from './chatShortcuts';

let mockCopy = chatAiFr;
jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: { chatAi: mockCopy } }) }));

const shortcut = { command: '/projets', title: 'Projets', help: 'Recherchez par nom.', example: '/projets Atlas' };
const onChooseAction = jest.fn(),
	onHighlightAction = jest.fn();
const props = {
	listId: 'shortcuts',
	shortcuts: [shortcut],
	activeIndex: 0,
	disabled: false,
	onChooseAction,
	onHighlightAction,
};

beforeEach(() => {
	jest.clearAllMocks();
	mockCopy = chatAiFr;
});

it('shows the full purpose and example without requiring hover', () => {
	render(<ChatShortcuts {...props} />);
	expect(screen.getByText(chatAiFr.shortcutsDescription)).toBeInTheDocument();
	const option = screen.getByRole('option');
	expect(option).toHaveAttribute('id', 'shortcuts-0');
	expect(option).toHaveAttribute('aria-selected', 'true');
	expect(option).toHaveTextContent('Recherchez par nom.');
	expect(option).toHaveTextContent('Exemple : /projets Atlas');
	fireEvent.pointerMove(option);
	expect(onHighlightAction).toHaveBeenCalledWith(0);
	fireEvent.click(option);
	expect(onChooseAction).toHaveBeenCalledWith('/projets');
});

it('does not allow selection while busy', () => {
	render(<ChatShortcuts {...props} disabled />);
	fireEvent.click(screen.getByRole('option'));
	expect(onChooseAction).not.toHaveBeenCalled();
});

it('localizes its guide and empty state in English', () => {
	mockCopy = chatAiEn;
	render(<ChatShortcuts {...props} shortcuts={[]} />);
	expect(screen.getByRole('listbox', { name: chatAiEn.shortcuts })).toBeInTheDocument();
	expect(screen.getByRole('status')).toHaveTextContent(chatAiEn.noMatchingShortcut);
	expect(screen.getByText(chatAiEn.shortcutsDescription)).toBeInTheDocument();
});
