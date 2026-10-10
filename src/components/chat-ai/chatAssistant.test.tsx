import { fireEvent, render, screen, within } from '@testing-library/react';
import { fr } from '@/translations/fr';
import ChatAssistant, { EnabledChatAssistant } from './chatAssistant';
import { useAppSelector } from '@/utils/hooks';
import { useSession } from 'next-auth/react';
import { getProfilState } from '@/store/selectors';
import type { ChatAssistantModel } from '@/utils/chat-ai/hooks/useChatAssistant';
import type { ReactNode } from 'react';

const mockModel: ChatAssistantModel = {
	open: true,
	setOpen: jest.fn(),
	close: jest.fn(),
	stop: jest.fn(),
	newChat: jest.fn(),
	capabilities: { can_report: false, suggestions: ['Comment créer une tâche ?'], shortcuts: [] },
	conversations: [],
	conversationId: null,
	loadConversation: jest.fn(),
	messages: [],
	draft: 'Cherche Atlas',
	setDraft: jest.fn(),
	busy: false,
	error: '',
	streamText: '',
	retry: null,
	send: jest.fn(),
	confirm: jest.fn(),
	removeConversation: jest.fn(),
	selectArchive: jest.fn(),
};
jest.mock('@/utils/chat-ai/hooks/useChatAssistant', () => ({ useChatAssistant: () => mockModel }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: fr, language: 'fr' }),
	useAppSelector: jest.fn(),
	useIsClient: () => true,
}));
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/shared/aiAssistantControl/aiAssistantDialog', () => ({
	__esModule: true,
	default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeAll(() => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});
beforeEach(() => {
	jest.clearAllMocks();
	mockModel.open = true;
	mockModel.busy = false;
	mockModel.streamText = '';
	mockModel.messages = [];
	mockModel.draft = 'Cherche Atlas';
	mockModel.capabilities = {
		can_report: false,
		suggestions: ['Comment créer une tâche ?'],
		shortcuts: [
			{ command: '/projets', title: 'Projets', help: 'Recherchez par nom ou description.', example: '/projets Atlas' },
			{
				command: '/taches',
				title: 'Tâches',
				help: 'Recherchez par titre ou description.',
				example: '/taches Moodboard',
			},
		],
	};
});
it('sends a starter question immediately and keeps the privacy explanation', () => {
	render(<EnabledChatAssistant token="test" />);
	expect(screen.getByRole('complementary', { name: fr.chatAi.title })).toBeInTheDocument();
	expect(screen.getByText(fr.chatAi.privacy)).toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: /Comment créer une tâche/ }));
	expect(mockModel.send).toHaveBeenCalledWith('Comment créer une tâche ?');
	expect(mockModel.setDraft).not.toHaveBeenCalled();
});
it('sends through Enter but preserves multiline/IME input and has cancellation', () => {
	const view = render(<EnabledChatAssistant token="test" />);
	const input = screen.getByRole('textbox');
	fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
	expect(mockModel.send).not.toHaveBeenCalled();
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(mockModel.send).not.toHaveBeenCalled();
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(mockModel.send).toHaveBeenCalledTimes(1);
	mockModel.busy = true;
	view.rerender(<EnabledChatAssistant token="test" />);
	fireEvent.click(screen.getByRole('button', { name: fr.chatAi.stop }));
	expect(mockModel.stop).toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: fr.chatAi.close }));
	expect(mockModel.close).toHaveBeenCalled();
});

it('keeps an accessible robot-only launcher', () => {
	mockModel.open = false;
	render(<EnabledChatAssistant token="test" />);
	const launcher = screen.getByRole('button', { name: fr.chatAi.open });
	expect(launcher).toHaveTextContent('');
	expect(launcher.querySelector('.lucide-bot')).not.toBeNull();
	expect(launcher).toHaveAttribute('title', fr.chatAi.open);
	fireEvent.click(launcher);
	expect(mockModel.setOpen).toHaveBeenCalledWith(true);
});

it('uses only the robot icon visually in the header while retaining an accessible name', () => {
	render(<EnabledChatAssistant token="test" />);
	const heading = screen.getByRole('heading', { name: fr.chatAi.title, level: 2 });
	expect(heading).toHaveClass('sr-only');
	expect(heading.closest('header')!.querySelector('.lucide-bot')).not.toBeNull();
});

it('preserves reply text and cards without like/dislike controls', () => {
	mockModel.messages = [{ id: 'reply', role: 'assistant', text: 'Voici votre réponse.', cards: [] }];
	render(<EnabledChatAssistant token="test" />);
	const reply = screen.getByText('Voici votre réponse.').closest('article')!;
	expect(reply).toBeInTheDocument();
	expect(reply).toHaveClass('assistantMessage');
	expect(within(reply).getByText(fr.chatAi.title)).toHaveClass('sr-only');
	expect(reply.querySelector('.lucide-bot')).not.toBeNull();
	expect(within(reply).queryAllByRole('button')).toHaveLength(0);
	expect(reply.querySelector('.lucide-thumbs-up, .lucide-thumbs-down')).toBeNull();
});

it('keeps assistant and user bubbles distinct and uses the assistant box while streaming', () => {
	mockModel.messages = [{ id: 'question', role: 'user', text: '/aide', cards: [] }];
	mockModel.busy = true;
	const view = render(<EnabledChatAssistant token="test" />);
	expect(screen.getByText('/aide').closest('article')).toHaveClass('userMessage');
	let pending = screen.getByRole('status');
	expect(pending).toHaveClass('assistantMessage');
	expect(within(pending).getByText(fr.chatAi.title)).toHaveClass('sr-only');
	expect(within(pending).getByText(fr.chatAi.thinking)).toBeInTheDocument();
	mockModel.streamText = 'Voici les raccourcis';
	view.rerender(<EnabledChatAssistant token="test" />);
	pending = screen.getByRole('status');
	expect(within(pending).getByText('Voici les raccourcis')).toBeInTheDocument();
	expect(within(pending).queryByText(fr.chatAi.thinking)).not.toBeInTheDocument();
});

it.each([
	{ can_view: false, is_staff: false, is_superuser: false, visible: false },
	{ can_view: true, is_staff: false, is_superuser: false, visible: true },
	{ can_view: false, is_staff: true, is_superuser: false, visible: true },
	{ can_view: false, is_staff: false, is_superuser: true, visible: true },
])('uses the native read and admin permissions for assistant visibility: %j', ({ visible, ...flags }) => {
	const previous = process.env.NEXT_PUBLIC_CHAT_AI_ASSISTANT_ENABLED;
	process.env.NEXT_PUBLIC_CHAT_AI_ASSISTANT_ENABLED = 'true';
	(useSession as jest.Mock).mockReturnValue({
		data: { user: { is_superuser: flags.is_superuser }, expires: '' },
		status: 'authenticated',
		update: jest.fn(),
	});
	jest
		.mocked(useAppSelector)
		.mockImplementation((selector) =>
			selector === getProfilState ? { id: 1, role: 'designer', ...flags } : 'test-token',
		);
	try {
		render(<ChatAssistant />);
		expect(!!screen.queryByRole('complementary', { name: fr.chatAi.title })).toBe(visible);
	} finally {
		if (previous === undefined) delete process.env.NEXT_PUBLIC_CHAT_AI_ASSISTANT_ENABLED;
		else process.env.NEXT_PUBLIC_CHAT_AI_ASSISTANT_ENABLED = previous;
	}
});

it.each(['Enter', 'Tab', 'click'])('completes /pro through %s without sending it', (method) => {
	mockModel.draft = '/pro';
	render(<EnabledChatAssistant token="test" />);
	const options = screen.getAllByRole('option');
	expect(options).toHaveLength(1);
	expect(options[0]).toHaveTextContent('/projets');
	expect(options[0]).toHaveTextContent('Recherchez par nom ou description.');
	expect(options[0]).toHaveTextContent('Exemple : /projets Atlas');
	if (method === 'click') fireEvent.click(options[0]);
	else fireEvent.keyDown(screen.getByRole('textbox'), { key: method });
	expect(mockModel.setDraft).toHaveBeenCalledWith('/projets ');
	expect(mockModel.send).not.toHaveBeenCalled();
	expect(screen.getByRole('textbox')).toHaveFocus();
});

it('lets arrow keys choose a shortcut and Escape dismiss it without closing the assistant', () => {
	mockModel.draft = '/';
	render(<EnabledChatAssistant token="test" />);
	const input = screen.getByRole('textbox');
	fireEvent.keyDown(input, { key: 'ArrowDown' });
	expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(mockModel.setDraft).toHaveBeenCalledWith('/taches ');
	fireEvent.keyDown(input, { key: 'Escape' });
	expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	expect(mockModel.close).not.toHaveBeenCalled();
});

it('offers only permitted shortcuts and sends a completed search normally', () => {
	mockModel.draft = '/bilan';
	const view = render(<EnabledChatAssistant token="test" />);
	expect(screen.queryByRole('option')).not.toBeInTheDocument();
	expect(screen.getByText(fr.chatAi.noMatchingShortcut)).toBeInTheDocument();
	mockModel.draft = '/projets Atlas';
	view.rerender(<EnabledChatAssistant token="test" />);
	expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
	expect(mockModel.send).toHaveBeenCalledWith();
});

it('opens the shortcut guide from its visible button and does not autocomplete IME or Shift+Enter', () => {
	mockModel.draft = '/pro';
	render(<EnabledChatAssistant token="test" />);
	const input = screen.getByRole('textbox');
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
	expect(mockModel.setDraft).not.toHaveBeenCalled();
	expect(mockModel.send).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: fr.chatAi.shortcutHint }));
	expect(mockModel.setDraft).toHaveBeenCalledWith('/');
	expect(input).toHaveFocus();
});
