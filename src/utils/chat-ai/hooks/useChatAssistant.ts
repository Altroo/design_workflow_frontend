'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useLanguage, useToast } from '@/utils/hooks';
import { designWorkflowApi } from '@/store/services/designWorkflow';
import { chatRequest, consumeChatStream } from '@/store/services/chatAssistant';
import { chatContext, chatErrorText } from '@/utils/chat-ai/chatHelpers';
import type {
	ChatCapabilities,
	ChatConfirmation,
	ChatConversation,
	ChatMessage,
	ChatContext,
} from '@/types/chatAiTypes';

type Attempt = { text: string; request_id: string; context: ChatContext };

export const useChatAssistant = (token: string) => {
	const { t, language } = useLanguage();
	const copy = t.chatAi;
	const { onSuccess } = useToast();
	const dispatch = useAppDispatch();
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [capabilities, setCapabilities] = useState<ChatCapabilities | null>(null);
	const [conversations, setConversations] = useState<ChatConversation[]>([]);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [streamText, setStreamText] = useState('');
	const [retry, setRetry] = useState<Attempt | null>(null);
	const active = useRef<AbortController | null>(null);
	useEffect(() => () => active.current?.abort(), []);

	useEffect(() => {
		if (!open || !token) return;
		const controller = new AbortController();
		void Promise.all([
			chatRequest(`capabilities/?language=${language}`, token, { signal: controller.signal }).then((r) => r.json()),
			chatRequest('conversations/?company_id=1', token, { signal: controller.signal }).then((r) => r.json()),
		])
			.then(([caps, history]) => {
				if (!controller.signal.aborted) {
					setCapabilities(caps);
					setConversations(history);
				}
			})
			.catch((reason) => {
				if (!controller.signal.aborted) setError(chatErrorText(reason, copy));
			});
		return () => controller.abort();
	}, [open, token, language, copy]);

	const close = () => {
		active.current?.abort();
		setOpen(false);
	};
	const stop = () => {
		active.current?.abort();
	};
	const newChat = () => {
		if (active.current) return;
		setConversationId(null);
		setMessages([]);
		setDraft('');
		setError('');
		setRetry(null);
		setStreamText('');
	};

	const loadConversation = async (id: string) => {
		if (active.current) return;
		const controller = new AbortController();
		active.current = controller;
		setBusy(true);
		setError('');
		setRetry(null);
		try {
			const data = await (await chatRequest(`conversations/${id}/`, token, { signal: controller.signal })).json();
			if (!controller.signal.aborted) {
				setConversationId(id);
				setMessages(data.messages);
				setDraft('');
			}
		} catch (reason) {
			if (!controller.signal.aborted) setError(chatErrorText(reason, copy));
		} finally {
			if (active.current === controller) {
				active.current = null;
				setBusy(false);
			}
		}
	};

	const send = async (attempt?: Attempt) => {
		const text = (attempt?.text ?? draft).trim();
		if (active.current || !text || text.length > 4000) return;
		const current = attempt ?? { text, request_id: crypto.randomUUID(), context: chatContext(pathname, language) };
		const controller = new AbortController();
		active.current = controller;
		setBusy(true);
		setError('');
		setStreamText('');
		setRetry(current);
		setDraft('');
		try {
			let id = conversationId;
			if (!id) {
				const created = await (
					await chatRequest('conversations/', token, {
						method: 'POST',
						body: JSON.stringify({ company_id: 1 }),
						signal: controller.signal,
					})
				).json();
				id = created.id as string;
				setConversationId(id);
				setConversations((items) => [
					{ id: id!, title: text.slice(0, 120), updated_at: new Date().toISOString() },
					...items,
				]);
			}
			setMessages((items) =>
				items.some((item) => item.id === `user-${current.request_id}`)
					? items
					: [...items, { id: `user-${current.request_id}`, role: 'user', text, cards: [] }],
			);
			const response = await chatRequest(`conversations/${id}/messages/`, token, {
				method: 'POST',
				body: JSON.stringify(current),
				signal: controller.signal,
				headers: { Accept: 'text/event-stream' },
			});
			await consumeChatStream(response, (event, payload) => {
				if (controller.signal.aborted) return;
				if (event === 'message.delta') setStreamText((value) => value + ((payload as { text?: string }).text ?? ''));
				if (event === 'message.completed') {
					const message = payload as ChatMessage;
					setMessages((items) => (items.some((item) => item.id === message.id) ? items : [...items, message]));
					setRetry(null);
					setStreamText('');
				}
			});
		} catch (reason) {
			setError(controller.signal.aborted ? copy.stopped : chatErrorText(reason, copy));
			setStreamText('');
		} finally {
			if (active.current === controller) {
				active.current = null;
				setBusy(false);
			}
		}
	};

	const confirm = async (card: ChatConfirmation) => {
		if (active.current) return false;
		const controller = new AbortController();
		active.current = controller;
		setBusy(true);
		setError('');
		try {
			await chatRequest(`actions/${card.action_id}/confirm/`, token, {
				method: 'POST',
				body: JSON.stringify({ confirmed: true }),
				signal: controller.signal,
			});
			setMessages((items) =>
				items.map((message) => ({
					...message,
					cards: message.cards.map((item) =>
						item.type === 'confirmation' && item.action_id === card.action_id
							? { type: 'confirmation_status' as const, status: 'completed' as const }
							: item,
					),
				})),
			);
			dispatch(
				designWorkflowApi.util.invalidateTags([
					'Task',
					'Project',
					'Dashboard',
					'Report',
					'Workload',
					'Search',
					'Chat',
					'Notification',
				]),
			);
			onSuccess(copy.done);
			return true;
		} catch (reason) {
			setError(chatErrorText(reason, copy));
			return false;
		} finally {
			if (active.current === controller) {
				active.current = null;
				setBusy(false);
			}
		}
	};

	const removeConversation = async (id: string) => {
		if (active.current) return false;
		const controller = new AbortController();
		active.current = controller;
		setBusy(true);
		try {
			await chatRequest(`conversations/${id}/`, token, { method: 'DELETE', signal: controller.signal });
			setConversations((items) => items.filter((item) => item.id !== id));
			if (conversationId === id) {
				setConversationId(null);
				setMessages([]);
				setRetry(null);
			}
			return true;
		} catch (reason) {
			setError(chatErrorText(reason, copy));
			return false;
		} finally {
			if (active.current === controller) {
				active.current = null;
				setBusy(false);
			}
		}
	};

	const feedback = async (id: string, helpful: boolean) => {
		try {
			await chatRequest('feedback/', token, { method: 'POST', body: JSON.stringify({ message_id: id, helpful }) });
			onSuccess(copy.feedbackSaved);
		} catch (reason) {
			setError(chatErrorText(reason, copy));
		}
	};
	const selectArchive = async (resource: 'project' | 'task', identifier: number) => {
		if (active.current || !conversationId) return;
		const controller = new AbortController();
		active.current = controller;
		setBusy(true);
		setError('');
		try {
			const response = await chatRequest(`conversations/${conversationId}/selection/`, token, {
				method: 'POST',
				body: JSON.stringify({ resource, identifier, operation: 'archive', interface_language: language }),
				signal: controller.signal,
			});
			const message: ChatMessage = await response.json();
			setMessages((items) => [...items, message]);
		} catch (reason) {
			setError(chatErrorText(reason, copy));
		} finally {
			if (active.current === controller) {
				active.current = null;
				setBusy(false);
			}
		}
	};
	return {
		open,
		setOpen,
		close,
		stop,
		newChat,
		capabilities,
		conversations,
		conversationId,
		loadConversation,
		messages,
		draft,
		setDraft,
		busy,
		error,
		streamText,
		retry,
		send,
		confirm,
		removeConversation,
		feedback,
		selectArchive,
	};
};
export type ChatAssistantModel = ReturnType<typeof useChatAssistant>;
