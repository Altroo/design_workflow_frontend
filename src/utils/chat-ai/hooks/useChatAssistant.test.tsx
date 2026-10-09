import { act, renderHook } from '@testing-library/react';
import { fr } from '@/translations/fr';
import { chatRequest, consumeChatStream, ChatAPIError } from '@/store/services/chatAssistant';
import { useChatAssistant } from './useChatAssistant';

const mockDispatch = jest.fn(),
	mockSuccess = jest.fn();
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: fr, language: 'fr' }),
	useAppDispatch: () => mockDispatch,
	useToast: () => ({ onSuccess: mockSuccess }),
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/dashboard/tasks/3' }));
jest.mock('@/store/services/designWorkflow', () => ({
	designWorkflowApi: { util: { invalidateTags: (tags: string[]) => ({ type: 'invalidate', tags }) } },
}));
jest.mock('@/store/services/chatAssistant', () => ({
	chatRequest: jest.fn(),
	consumeChatStream: jest.fn(),
	ChatAPIError: class extends Error {
		constructor(public code: string) {
			super(code);
		}
	},
}));
const request = jest.mocked(chatRequest),
	stream = jest.mocked(consumeChatStream);
const json = (data: unknown) => ({ json: async () => data }) as Response;
beforeEach(() => {
	jest.clearAllMocks();
	request.mockImplementation(async (path) => (path === 'conversations/' ? json({ id: 'conv' }) : json({})));
	stream.mockImplementation(async (_, receive) => {
		receive('message.delta', { text: 'Ready' });
		receive('message.completed', { id: 'reply', role: 'assistant', text: 'Ready', cards: [] });
	});
});

it('creates one conversation, guards double-send and supplies only native page context', async () => {
	const { result } = renderHook(() => useChatAssistant('token'));
	act(() => result.current.setDraft('Find my task'));
	await act(async () => {
		await Promise.all([result.current.send(), result.current.send()]);
	});
	expect(request.mock.calls.map((call) => call[0])).toEqual(['conversations/', 'conversations/conv/messages/']);
	const sent = JSON.parse(request.mock.calls[1][2]?.body as string);
	expect(sent.context).toEqual({ resource: 'task', identifier: 3, interface_language: 'fr' });
	expect(result.current.messages).toHaveLength(2);
	expect(result.current.retry).toBeNull();
	expect(result.current.busy).toBe(false);
});

it('retries the same request identifier without duplicating its user message', async () => {
	stream.mockRejectedValueOnce(new ChatAPIError('BUSY'));
	const { result } = renderHook(() => useChatAssistant('token'));
	act(() => result.current.setDraft('Find Atlas'));
	await act(async () => {
		await result.current.send();
	});
	expect(result.current.error).toBe(fr.chatAi.errors.BUSY);
	const failed = result.current.retry!;
	await act(async () => {
		await result.current.send(failed);
	});
	expect(JSON.parse(request.mock.calls[2][2]?.body as string).request_id).toBe(failed.request_id);
	expect(result.current.messages.filter((item) => item.role === 'user')).toHaveLength(1);
});

it('clears visible history on a new conversation and keeps saved history server-side', async () => {
	const { result } = renderHook(() => useChatAssistant('token'));
	act(() => result.current.setDraft('Find Atlas'));
	await act(async () => {
		await result.current.send();
	});
	act(() => result.current.newChat());
	expect(result.current.messages).toEqual([]);
	expect(result.current.conversationId).toBeNull();
	expect(result.current.conversations).toHaveLength(1);
	expect(request.mock.calls.some((call) => call[2]?.method === 'DELETE')).toBe(false);
});

it('requires an explicit confirmation request and refreshes native workflow caches', async () => {
	const { result } = renderHook(() => useChatAssistant('token'));
	await act(async () => {
		await result.current.confirm({
			type: 'confirmation',
			action_id: 'proposal',
			resource: 'task',
			record_id: 3,
			operation: 'update',
			label: 'Card',
			before: { title: 'Old' },
			changes: { title: 'New' },
			running_tasks: 0,
			expires_at: '',
		});
	});
	expect(request).toHaveBeenCalledWith(
		'actions/proposal/confirm/',
		'token',
		expect.objectContaining({ method: 'POST', body: '{"confirmed":true}' }),
	);
	expect(mockDispatch).toHaveBeenCalledWith(
		expect.objectContaining({ type: 'invalidate', tags: expect.arrayContaining(['Project', 'Task', 'Report']) }),
	);
	expect(mockSuccess).toHaveBeenCalledWith(fr.chatAi.done);
});
