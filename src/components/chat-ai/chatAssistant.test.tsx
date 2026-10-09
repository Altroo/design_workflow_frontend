import { fireEvent, render, screen } from '@testing-library/react';
import { fr } from '@/translations/fr';
import { EnabledChatAssistant } from './chatAssistant';
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
	feedback: jest.fn(),
	selectArchive: jest.fn(),
};
jest.mock('@/utils/chat-ai/hooks/useChatAssistant', () => ({ useChatAssistant: () => mockModel }));
jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: fr, language: 'fr' }), useAppSelector: jest.fn() }));
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
	mockModel.busy = false;
});
it('opens one native panel with starter questions and a privacy explanation', () => {
	render(<EnabledChatAssistant token="test" />);
	expect(screen.getByRole('complementary', { name: fr.chatAi.title })).toBeInTheDocument();
	expect(screen.getByText(fr.chatAi.privacy)).toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: /Comment créer une tâche/ }));
	expect(mockModel.setDraft).toHaveBeenCalledWith('Comment créer une tâche ?');
	expect(screen.getByRole('textbox')).toHaveFocus();
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
