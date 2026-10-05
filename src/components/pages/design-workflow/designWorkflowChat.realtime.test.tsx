import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { ChatMessage, ChatThread, ProjectSummary, WorkflowUser } from '@/types/designWorkflowTypes';
import { getAccessToken, getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';
import DesignWorkflowChat from './designWorkflowChat';

const mockUseAppSelector = jest.fn();
const mockSubscribe = jest.fn();
const mockSend = jest.fn<boolean, [unknown]>(() => true);
const mockLoadOlder = jest.fn();
const mockMutation = jest.fn(() => ({ unwrap: async () => ({}) }));
const mockRefetch = jest.fn();
const mockUseMessages = jest.fn();
let mockSocketListener: ((payload: unknown) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockUsers: WorkflowUser[] = [];
const mockThreads: ChatThread[] = [];
const mockProjects: ProjectSummary[] = [];

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
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

const owner: WorkflowUser = { id: 1, first_name: 'Owner', last_name: 'Local', email: 'owner@example.test', role: 'designer' };
const peer: WorkflowUser = { id: 2, first_name: 'Peer', last_name: 'Local', email: 'peer@example.test', role: 'designer' };
const message = (id: number, body: string, thread = 10): ChatMessage => ({
  id, body, thread, sender: owner, attachments: [], read_by: [owner], mentions: [], reply_to: null,
  reactions: [], reminders: [], is_read: true, is_deleted: false, deleted_at: null,
  edited_by: null, edited_at: null, edit_count: 0, decision_by: null, decision_at: null,
  created_at: '2026-10-05T10:00:00Z', updated_at: '2026-10-05T10:00:00Z',
});
const thread = (id: number, kind: ChatThread['kind']): ChatThread => ({
  id, kind, title: 'Local chat', project: null, task: null, participants: [owner, peer], last_message: null,
  unread_count: 0, context_url: null, created_at: '2026-10-05T10:00:00Z', updated_at: '2026-10-05T10:00:00Z',
});
const publicMessages = [message(100, 'Latest public one'), message(101, 'Latest public two')];
const privateMessages = [message(200, 'Latest private one', 20), message(201, 'Latest private two', 20)];
const emit = (payload: unknown) => act(() => { mockSocketListener?.(payload); });
const deferredHistory = () => {
  let resolve!: (messages: ChatMessage[]) => void;
  const promise = new Promise<ChatMessage[]>((resolvePromise) => { resolve = resolvePromise; });
  mockLoadOlder.mockReturnValueOnce({ unwrap: () => promise });
  return resolve;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSocketListener = null;
  mockThreads.splice(0, mockThreads.length, thread(10, 'public'), thread(20, 'private'));
  mockUsers.splice(0, mockUsers.length, { ...peer, is_active: true } as WorkflowUser);
  mockProjects.splice(0, mockProjects.length);
  mockUseAppSelector.mockImplementation((selector) => selector === getAccessToken ? 'token' : selector === getProfilState ? owner : selector === getWSOnlineUserIdsState ? [2] : undefined);
  mockUseMessages.mockImplementation(({ threadId }: { threadId: number }) => ({ currentData: threadId === 20 ? privateMessages : publicMessages, isLoading: false, isFetching: false, refetch: mockRefetch }));
  mockLoadOlder.mockReturnValue({ unwrap: async () => [message(90, 'Older original')] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: jest.fn() });
});

it('shares one socket subscription across thread switches and sends typing to the selected thread', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<DesignWorkflowChat />);
  expect(mockSubscribe).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: /Peer Local/ }));
  expect(screen.getByText('Latest private one')).toBeInTheDocument();
  expect(mockSubscribe).toHaveBeenCalledTimes(1);
  const composer = document.querySelector<HTMLTextAreaElement>('.workflow-chat-composer textarea')!;
  fireEvent.change(composer, { target: { value: 'Hello' } });
  expect(mockSend).toHaveBeenCalledWith({ type: 'chat.typing', thread_id: 20, is_typing: true });
  emit({ type: 'chat.typing', thread_id: 10, user: peer, is_typing: true });
  expect(document.querySelector('.workflow-chat-typing')).not.toBeInTheDocument();
  emit({ type: 'chat.typing', thread_id: 20, user: peer, is_typing: true });
  expect(document.querySelector('.workflow-chat-typing')).toHaveTextContent('Peer Local');
  unmount();
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
});

it('updates and deletes older history from live payloads without redundant query refetch', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(await screen.findByText('Older original')).toBeInTheDocument();
  emit({ type: 'chat.updated', thread_id: 10, message: message(90, 'Older edited live') });
  expect(screen.queryByText('Older original')).not.toBeInTheDocument();
  expect(screen.getByText('Older edited live')).toBeInTheDocument();
  emit({ type: 'chat.deleted', thread_id: 10, message: { ...message(90, ''), is_deleted: true } });
  expect(screen.queryByText('Older edited live')).not.toBeInTheDocument();
  expect(document.getElementById('chat-message-90')).toHaveTextContent('Message deleted');
  expect(mockRefetch).not.toHaveBeenCalled();
});

it('does not let a delayed page overwrite a newer live message', async () => {
  const user = userEvent.setup();
  const resolve = deferredHistory();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  emit({ type: 'chat.updated', thread_id: 10, message: message(90, 'Newer live content') });
  await act(async () => { resolve([message(90, 'Stale response')]); });
  expect(screen.getByText('Newer live content')).toBeInTheDocument();
  expect(screen.queryByText('Stale response')).not.toBeInTheDocument();
});

it('applies reactions to older messages only in their own thread', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(await screen.findByText('Older original')).toBeInTheDocument();
  emit({ type: 'chat.updated', thread_id: 20, message: message(90, 'Different thread', 20) });
  expect(screen.getByText('Older original')).toBeInTheDocument();
  emit({ type: 'chat.reaction', thread_id: 10, message: { ...message(90, 'Older original'), reactions: [{ id: 1, emoji: '👍', user: peer, created_at: '2026-10-05T10:00:00Z' }] } });
  expect(document.querySelector('#chat-message-90 .workflow-chat-reactions')).toHaveTextContent('Peer Local');
});

it('opens the incoming conversation accordion without switching the active conversation', () => {
  render(<DesignWorkflowChat />);
  const directAccordion = document.querySelector<HTMLButtonElement>('button[aria-controls="workflow-chat-direct-list"]');
  expect(directAccordion).toHaveAttribute('aria-expanded', 'false');
  emit({ type: 'chat.message', message: { ...message(202, 'Private incoming', 20), sender: peer } });
  expect(directAccordion).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Latest public one')).toBeInTheDocument();
  expect(screen.queryByText('Latest private one')).not.toBeInTheDocument();
});

it('drops history responses from a previous thread', async () => {
  const user = userEvent.setup();
  const resolve = deferredHistory();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  await user.click(screen.getByRole('button', { name: /Peer Local/ }));
  await act(async () => { resolve([message(90, 'Old thread leaked')]); });
  expect(screen.queryByText('Old thread leaked')).not.toBeInTheDocument();
  expect(screen.getByText('Latest private one')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Load older/i })).toBeEnabled();
});

it('clears older snapshots on reconnect and ignores pre-reconnect loads', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(await screen.findByText('Older original')).toBeInTheDocument();
  emit({ type: 'reconnected' });
  expect(screen.queryByText('Older original')).not.toBeInTheDocument();
  const resolve = deferredHistory();
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  emit({ type: 'reconnected' });
  await act(async () => { resolve([message(90, 'Offline snapshot')]); });
  expect(screen.queryByText('Offline snapshot')).not.toBeInTheDocument();
  expect(mockSubscribe).toHaveBeenCalledTimes(1);
});

it('preserves search filters while paging and discards a response after search changes', async () => {
  const user = userEvent.setup();
  const resolve = deferredHistory();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  await user.click(screen.getByRole('button', { name: /Filter/i }));
  const search = screen.getByPlaceholderText('Search in chat');
  fireEvent.change(search, { target: { value: 'different' } });
  await act(async () => { resolve([message(90, 'Old search result')]); });
  expect(screen.queryByText('Old search result')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: /Load older/i })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(mockLoadOlder).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'different', threadId: 10 }));
});

it('retains boundary messages when the newest page rolls forward beside loaded history', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(await screen.findByText('Older original')).toBeInTheDocument();
  const nextPage = [publicMessages[1], message(102, 'New public message')];
  mockUseMessages.mockReturnValue({ currentData: nextPage, isLoading: false, isFetching: false, refetch: mockRefetch });
  rerender(<DesignWorkflowChat />);
  expect(screen.getByText('Latest public one')).toBeInTheDocument();
  expect(screen.getByText('Latest public two')).toBeInTheDocument();
  expect(screen.getByText('New public message')).toBeInTheDocument();
  expect(screen.getByText('Older original')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Load older/i })).not.toBeInTheDocument();
});

it('retains boundary messages if the latest page rolls forward during an older-page request', async () => {
  const user = userEvent.setup();
  const resolve = deferredHistory();
  const { rerender } = render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  mockUseMessages.mockReturnValue({ currentData: [publicMessages[1], message(102, 'New message during load')], isLoading: false, isFetching: false });
  rerender(<DesignWorkflowChat />);
  await act(async () => { resolve([message(90, 'Requested older message')]); });
  expect(screen.getByText('Latest public one')).toBeInTheDocument();
  expect(screen.getByText('Requested older message')).toBeInTheDocument();
  expect(screen.getByText('New message during load')).toBeInTheDocument();
});

it('does not restore an item removed inside the newest filtered page', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(await screen.findByText('Older original')).toBeInTheDocument();
  mockUseMessages.mockReturnValue({ currentData: [message(99, 'Newly included result'), publicMessages[1]], isLoading: false, isFetching: false });
  rerender(<DesignWorkflowChat />);
  expect(screen.queryByText('Latest public one')).not.toBeInTheDocument();
  expect(screen.getByText('Newly included result')).toBeInTheDocument();
  expect(screen.getByText('Older original')).toBeInTheDocument();
});

it.each([
  { type: 'receive_group_message', message: { type: 'WORKFLOW_EVENT', scope: 'users' } },
  { message: { type: 'USER_AVATAR', pk: 2, avatar: '/updated-avatar.webp' } },
])('discards stale embedded user snapshots after a user event', async (payload) => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  expect(await screen.findByText('Older original')).toBeInTheDocument();
  emit(payload);
  expect(screen.queryByText('Older original')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Load older/i })).toBeEnabled();
  expect(mockRefetch).not.toHaveBeenCalled();
});

const actionButton = (id: number, name: RegExp) => within(document.getElementById(`chat-message-${id}`)!).getByRole('button', { name });
const actionModal = () => document.querySelector<HTMLElement>('.workflow-chat-create-card')!;
const editedMessage = (id: number, body: string, extra: Partial<ChatMessage> = {}) => ({
  ...message(id, body), updated_at: '2026-10-05T11:00:00Z', ...extra,
});

it('refreshes a reply preview and removes a deleted reference without losing the composer draft', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Reply$/));
  const composer = document.querySelector<HTMLTextAreaElement>('.workflow-chat-composer textarea')!;
  fireEvent.change(composer, { target: { value: 'My unsent reply' } });
  emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Reply source changed') });
  expect(document.querySelector('.workflow-chat-reply-preview')).toHaveTextContent('Reply source changed');
  emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
  expect(document.querySelector('.workflow-chat-reply-preview')).not.toBeInTheDocument();
  expect(composer).toHaveValue('My unsent reply');
});

it('forwards the live source instead of the snapshot selected before an edit', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Forward/));
  emit({ type: 'chat.updated', thread_id: 20, message: editedMessage(100, 'Wrong thread', { thread: 20 }) });
  expect(actionModal()).toHaveTextContent('Latest public one');
  emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Forward the corrected text') });
  expect(actionModal()).toHaveTextContent('Forward the corrected text');
  await user.click(within(actionModal()).getByRole('button', { name: /Peer Local/ }));
  const call = mockMutation.mock.calls.at(-1) as unknown as [{ threadId: number; data: FormData }];
  expect(call[0].threadId).toBe(20);
  expect(call[0].data.get('body')).toBe('Forward the corrected text');
});

it('closes forwarding when its source was deleted remotely', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Forward/));
  emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
  expect(document.querySelector('.workflow-chat-forward-list')).not.toBeInTheDocument();
  expect(mockMutation).not.toHaveBeenCalled();
});

it('updates reminder context without resetting its note and disables a deleted source', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Add reminder$/));
  const note = within(actionModal()).getByRole('textbox', { name: 'Note' });
  fireEvent.change(note, { target: { value: 'Keep my reminder note' } });
  emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Reminder source corrected') });
  expect(actionModal()).toHaveTextContent('Reminder source corrected');
  expect(note).toHaveValue('Keep my reminder note');
  emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
  expect(actionModal()).toHaveTextContent('Message deleted');
  expect(note).toHaveValue('Keep my reminder note');
  expect(within(actionModal()).getByRole('button', { name: 'Add reminder' })).toBeDisabled();
});

it('refreshes untouched edit text but preserves typed edits when the source changes or is deleted', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Edit message$/));
  const editor = document.querySelector<HTMLTextAreaElement>('.workflow-chat-edit-box textarea')!;
  emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Other session edit') });
  expect(editor).toHaveValue('Other session edit');
  fireEvent.change(editor, { target: { value: 'My unsaved edit' } });
  emit({ type: 'chat.updated', thread_id: 10, message: editedMessage(100, 'Second other edit') });
  expect(editor).toHaveValue('My unsaved edit');
  emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
  expect(editor).toHaveValue('My unsaved edit');
  expect(within(document.querySelector<HTMLElement>('.workflow-chat-edit-box')!).getByRole('button', { name: 'Save' })).toBeDisabled();
});

it('reconciles open actions from query refreshes as well as socket payloads', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Forward/));
  mockUseMessages.mockReturnValue({ currentData: [editedMessage(100, 'Updated from query'), publicMessages[1]], isLoading: false, isFetching: false });
  rerender(<DesignWorkflowChat />);
  expect(actionModal()).toHaveTextContent('Updated from query');
  mockUseMessages.mockReturnValue({ currentData: [editedMessage(100, '', { is_deleted: true }), publicMessages[1]], isLoading: false, isFetching: false });
  rerender(<DesignWorkflowChat />);
  expect(document.querySelector('.workflow-chat-forward-list')).not.toBeInTheDocument();
});

it('verifies an older forward source after reconnect before allowing forwarding', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(screen.getByRole('button', { name: /Load older/i }));
  await user.click(actionButton(90, /^Forward/));
  const resolve = deferredHistory();
  emit({ type: 'reconnected' });
  expect(mockLoadOlder).toHaveBeenLastCalledWith({ threadId: 10, before_id: 91, limit: 1 });
  expect(within(actionModal()).getByRole('button', { name: /Peer Local/ })).toBeDisabled();
  await act(async () => { resolve([editedMessage(90, 'Fresh after reconnect')]); });
  expect(actionModal()).toHaveTextContent('Fresh after reconnect');
  expect(within(actionModal()).getByRole('button', { name: /Peer Local/ })).toBeEnabled();
  expect(document.getElementById('chat-message-90')).not.toBeInTheDocument();
});

it('ignores a pre-reconnect action response after switching conversations', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Reply$/));
  const resolve = deferredHistory();
  emit({ type: 'reconnected' });
  await user.click(screen.getByRole('button', { name: /Peer Local/ }));
  await act(async () => { resolve([editedMessage(100, 'Old conversation source')]); });
  expect(document.querySelector('.workflow-chat-reply-preview')).not.toBeInTheDocument();
  expect(screen.queryByText('Old conversation source')).not.toBeInTheDocument();
});

it('preserves a task draft while disabling its remotely deleted source', async () => {
  mockProjects.push({ id: 1, name: 'Writable project', can_work: true, archived: false } as ProjectSummary);
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Create task from message$/));
  const title = within(actionModal()).getByRole('textbox', { name: 'Task title' });
  const description = within(actionModal()).getByRole('textbox', { name: 'Description' });
  fireEvent.change(title, { target: { value: 'My task title' } });
  fireEvent.change(description, { target: { value: 'My task description' } });
  emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
  expect(actionModal()).toHaveTextContent('Message deleted');
  expect(title).toHaveValue('My task title');
  expect(description).toHaveValue('My task description');
  expect(within(actionModal()).getByRole('button', { name: 'Create task' })).toBeDisabled();
});

it('closes an obsolete delete confirmation after remote deletion', async () => {
  const user = userEvent.setup();
  render(<DesignWorkflowChat />);
  await user.click(actionButton(100, /^Delete message$/));
  expect(document.querySelector('.workflow-chat-confirm-modal')).toBeInTheDocument();
  emit({ type: 'chat.deleted', thread_id: 10, message: editedMessage(100, '', { is_deleted: true }) });
  expect(document.querySelector('.workflow-chat-confirm-modal')).not.toBeInTheDocument();
});
