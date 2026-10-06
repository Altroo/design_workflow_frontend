import { act, within } from '@testing-library/react';

import { type ReactNode } from 'react';
import type { ChatMessage, ChatThread, ProjectSummary, WorkflowUser } from '@/types/designWorkflowTypes';
import { getAccessToken, getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';

const mockUseAppSelector = jest.fn();

const mockSubscribe = jest.fn();

const mockSend = jest.fn<boolean, [unknown]>(() => true);

const mockLoadOlder = jest.fn();

const mockMutation = jest.fn<{ unwrap: () => Promise<unknown> }, [unknown?]>(() => ({ unwrap: async () => ({}) }));

const mockRefetch = jest.fn();

const mockUseMessages = jest.fn();

let mockSocketListener: ((payload: unknown) => void) | null = null;

const mockUnsubscribe = jest.fn();

const mockUsers: WorkflowUser[] = [];

const mockThreads: ChatThread[] = [];

const mockProjects: ProjectSummary[] = [];

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock('@/utils/hooks', () => {
	const { en } = jest.requireActual('@/translations/en') as typeof import('@/translations/en');
	return {
		useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
		useLanguage: () => ({ language: 'en', t: en }),
		useToast: () => ({ onError: jest.fn() }),
	};
});

jest.mock('@/store/services/ws', () => ({
	subscribeWorkflowSocket: (listener: (payload: unknown) => void) => {
		mockSocketListener = listener;
		mockSubscribe(listener);
		return mockUnsubscribe;
	},
	sendWorkflowSocket: (payload: unknown) => mockSend(payload),
}));

jest.mock('@/utils/rawData', () => ({ ...jest.requireActual('@/utils/rawData'), CHAT_PAGE_SIZE: 2 }));

jest.mock('@/store/services/account', () => ({ useGetUsersListQuery: () => ({ data: mockUsers }) }));

jest.mock('@/store/services/designWorkflow', () => ({
	useGetChatThreadsQuery: () => ({ data: mockThreads, isLoading: false, isFetching: false, refetch: mockRefetch }),
	useGetChatMessagesQuery: (...args: unknown[]) => mockUseMessages(...args),
	useLazyGetChatMessagesQuery: () => [mockLoadOlder],
	useGetProjectsQuery: () => ({ data: mockProjects }),
	useGetTasksQuery: () => ({ data: [] }),
	useAddChatReminderMutation: () => [mockMutation, {}],
	useCreateChatThreadMutation: () => [mockMutation, {}],
	useCreateTaskMutation: () => [mockMutation, {}],
	useDeleteChatMessageMutation: () => [mockMutation, {}],
	useEditChatMessageMutation: () => [mockMutation, {}],
	useMarkChatMessageReadMutation: () => [mockMutation, {}],
	useReactChatMessageMutation: () => [mockMutation, {}],
	useSendChatMessageMutation: () => [mockMutation, {}],
}));

const owner: WorkflowUser = {
	id: 1,
	first_name: 'Owner',
	last_name: 'Local',
	email: 'owner@example.test',
	role: 'designer',
};

const peer: WorkflowUser = {
	id: 2,
	first_name: 'Peer',
	last_name: 'Local',
	email: 'peer@example.test',
	role: 'designer',
};

const message = (id: number, body: string, thread = 10): ChatMessage => ({
	id,
	body,
	thread,
	sender: owner,
	attachments: [],
	read_by: [owner],
	mentions: [],
	reply_to: null,
	reactions: [],
	reminders: [],
	is_read: true,
	is_deleted: false,
	deleted_at: null,
	edited_by: null,
	edited_at: null,
	edit_count: 0,
	decision_by: null,
	decision_at: null,
	created_at: '2026-10-05T10:00:00Z',
	updated_at: '2026-10-05T10:00:00Z',
});

const thread = (id: number, kind: ChatThread['kind']): ChatThread => ({
	id,
	kind,
	title: 'Local chat',
	project: null,
	task: null,
	participants: [owner, peer],
	last_message: null,
	unread_count: 0,
	context_url: null,
	created_at: '2026-10-05T10:00:00Z',
	updated_at: '2026-10-05T10:00:00Z',
});

const publicMessages = [message(100, 'Latest public one'), message(101, 'Latest public two')];

const privateMessages = [message(200, 'Latest private one', 20), message(201, 'Latest private two', 20)];

const emit = (payload: unknown) =>
	act(() => {
		mockSocketListener?.(payload);
	});

const deferredHistory = () => {
	let resolve!: (messages: ChatMessage[]) => void;
	const promise = new Promise<ChatMessage[]>((resolvePromise) => {
		resolve = resolvePromise;
	});
	mockLoadOlder.mockReturnValueOnce({ unwrap: () => promise });
	return resolve;
};

beforeEach(() => {
	jest.clearAllMocks();
	mockSocketListener = null;
	mockThreads.splice(0, mockThreads.length, thread(10, 'public'), thread(20, 'private'));
	mockUsers.splice(0, mockUsers.length, { ...peer, is_active: true } as WorkflowUser);
	mockProjects.splice(0, mockProjects.length);
	mockUseAppSelector.mockImplementation((selector) =>
		selector === getAccessToken
			? 'token'
			: selector === getProfilState
				? owner
				: selector === getWSOnlineUserIdsState
					? [2]
					: undefined,
	);
	mockUseMessages.mockImplementation(({ threadId }: { threadId: number }) => ({
		currentData: threadId === 20 ? privateMessages : publicMessages,
		isLoading: false,
		isFetching: false,
		refetch: mockRefetch,
	}));
	mockLoadOlder.mockReturnValue({ unwrap: async () => [message(90, 'Older original')] });
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: jest.fn() });
});

const actionButton = (id: number, name: RegExp) =>
	within(document.getElementById(`chat-message-${id}`)!).getByRole('button', { name });

const actionModal = () => document.querySelector<HTMLElement>('.workflow-chat-create-card')!;

const editedMessage = (id: number, body: string, extra: Partial<ChatMessage> = {}) => ({
	...message(id, body),
	updated_at: '2026-10-05T11:00:00Z',
	...extra,
});

export {
	mockUseAppSelector,
	mockSubscribe,
	mockSend,
	mockLoadOlder,
	mockMutation,
	mockRefetch,
	mockUseMessages,
	mockSocketListener,
	mockUnsubscribe,
	mockUsers,
	mockThreads,
	mockProjects,
	owner,
	peer,
	message,
	thread,
	publicMessages,
	privateMessages,
	emit,
	deferredHistory,
	actionButton,
	actionModal,
	editedMessage,
};
