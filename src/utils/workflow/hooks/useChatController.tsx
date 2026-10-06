'use client';

import {
	dedupeMessages,
	detectDueDate,
	EMPTY_CHAT_MESSAGES,
	extractReferenceIds,
	isSocketRecord,
	linkedReferencesForBody,
	mentionTokenFor,
	readableReferenceText,
	referenceTokenFor,
	scrollToMessage,
	sectionForThread,
	threadPreview,
	userLabel,
} from '@/utils/workflow/chatHelpers';
import type { UserClass } from '@/models/classes';
import { getAccessToken, getProfilState, getWSOnlineUserIdsState } from '@/store/selectors';
import { useGetUsersListQuery } from '@/store/services/account';
import {
	useAddChatReminderMutation,
	useCreateChatThreadMutation,
	useCreateTaskMutation,
	useDeleteChatMessageMutation,
	useEditChatMessageMutation,
	useGetChatMessagesQuery,
	useGetChatThreadsQuery,
	useGetProjectsQuery,
	useGetTasksQuery,
	useLazyGetChatMessagesQuery,
	useMarkChatMessageReadMutation,
	useReactChatMessageMutation,
	useSendChatMessageMutation,
} from '@/store/services/designWorkflow';
import { sendWorkflowSocket, subscribeWorkflowSocket } from '@/store/services/ws';
import type { ChatMessage, ChatThread, ProjectSummary, TaskCard, WorkflowUser } from '@/types/designWorkflowTypes';
import type { ChatDrawerMode, ChatSearchFilters, ChatSidebarSection } from '@/types/workflowChatTypes';
import { attachmentsExceedLimit } from '@/utils/attachments';
import { extractApiErrorMessage } from '@/utils/helpers';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import {
	MESSAGE_SPINNER_HIDE_DELAY_MS,
	MESSAGE_SPINNER_SHOW_DELAY_MS,
	CHAT_PAGE_SIZE as PAGE_SIZE,
	WORK_DAY_MINUTES,
} from '@/utils/rawData';
import { useSearchParams } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export const useChatController = () => {
	const { t, language } = useLanguage();
	const { onError } = useToast();
	const [attachmentUploadProgress, setAttachmentUploadProgress] = useState<number | null>(null);
	const searchParams = useSearchParams();
	const requestedThreadId = Number(searchParams.get('thread') ?? 0) || null;
	const requestedMessageId = Number(searchParams.get('message') ?? 0) || null;
	const requestedMessageKey =
		requestedThreadId && requestedMessageId ? `${requestedThreadId}:${requestedMessageId}` : '';
	const locale = language === 'en' ? 'en-US' : 'fr-FR';
	const statusLabelFor = (value?: string | null) => (value ? (t.workflow.statuses[value] ?? value) : '');
	const profile = useAppSelector(getProfilState);
	const token = useAppSelector(getAccessToken);
	const onlineUserIds = useAppSelector(getWSOnlineUserIdsState);
	const chatDataReady = Boolean(token && (typeof profile.id === 'number' || profile.email));
	const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
	const [optimisticSelectedThread, setOptimisticSelectedThread] = useState<ChatThread | null>(null);
	const [body, setBody] = useState('');
	const [files, setFiles] = useState<File[]>([]);
	const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
	const [referencesOpen, setReferencesOpen] = useState(false);
	const [drawerMode, setDrawerMode] = useState<ChatDrawerMode>('references');
	const [chatToolsOpen, setChatToolsOpen] = useState(false);
	const [openSidebarSection, setOpenSidebarSection] = useState<ChatSidebarSection>('projects');
	const [searchTerm, setSearchTerm] = useState('');
	const [searchFilters, setSearchFilters] = useState<ChatSearchFilters>({});
	const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
	const [hasOlder, setHasOlder] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
	const [selectedImage, setSelectedImage] = useState<{ src: string; name: string } | null>(null);
	const [previewTarget, setPreviewTarget] = useState<{ kind: 'task' | 'project'; id: number } | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [editText, setEditText] = useState('');
	const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
	const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
	const [reminderMessage, setReminderMessage] = useState<ChatMessage | null>(null);
	const [reminderDraft, setReminderDraft] = useState({ taskId: '', remindDate: '', remindTime: '', note: '' });
	const [typingUsers, setTypingUsers] = useState<Record<number, WorkflowUser>>({});
	const [recordingUsers, setRecordingUsers] = useState<Record<number, WorkflowUser>>({});
	const [messagesBusyVisible, setMessagesBusyVisible] = useState(false);
	const [recording, setRecording] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [taskModalOpen, setTaskModalOpen] = useState(false);
	const [taskSourceMessage, setTaskSourceMessage] = useState<ChatMessage | null>(null);
	const [taskDraft, setTaskDraft] = useState({ title: '', description: '', projectId: '' });
	const [selectedComposerText, setSelectedComposerText] = useState('');
	const [deleteTargetMessage, setDeleteTargetMessage] = useState<ChatMessage | null>(null);
	const [pendingActionSources, setPendingActionSources] = useState<Set<number>>(new Set());
	const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
	const [referenceActiveIndex, setReferenceActiveIndex] = useState(0);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const markedReadIdsRef = useRef<Set<number>>(new Set());
	const historyContextRef = useRef(0);
	const actionContextRef = useRef(0);
	const olderRequestRef = useRef<{ context: number } | null>(null);
	const historyUpdatesRef = useRef(new Map<number, ChatMessage>());
	const historyExpandedRef = useRef(false);
	const currentPageSnapshotRef = useRef<{ context: number; messages: ChatMessage[] } | null>(null);
	const typingTimeoutRef = useRef<number | null>(null);
	const typingPresenceTimeoutsRef = useRef<Record<number, number>>({});
	const recordingPresenceTimeoutsRef = useRef<Record<number, number>>({});
	const messagesBusyTimeoutRef = useRef<number | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordingRequestRef = useRef<object | null>(null);
	const discardRecordingRef = useRef(false);
	const autoStartedProjectThreadRef = useRef(false);
	const highlightedMessageKeyRef = useRef<string | null>(null);
	const threadSectionsRef = useRef<Map<number, ChatSidebarSection>>(new Map());
	const pendingIncomingThreadIdRef = useRef<number | null>(null);
	const {
		data: threads = [],
		isLoading: threadsLoading,
		isFetching: threadsFetching,
	} = useGetChatThreadsQuery(undefined, { skip: !chatDataReady });
	const chatThreads = threads.filter((thread) => thread.kind !== 'task');
	const requestedThreadAvailable = Boolean(
		requestedThreadId && chatThreads.some((thread) => thread.id === requestedThreadId),
	);
	const preferredThread =
		chatThreads.find((thread) => thread.kind === 'public') ??
		chatThreads.find((thread) => thread.unread_count > 0) ??
		chatThreads.find((thread) => thread.last_message) ??
		chatThreads[0];
	const selectedThread =
		chatThreads.find((thread) => thread.id === selectedThreadId) ??
		(optimisticSelectedThread?.id === selectedThreadId ? optimisticSelectedThread : undefined) ??
		preferredThread;
	const selectedThreadSection = sectionForThread(selectedThread);
	useEffect(() => {
		if (!selectedThread?.id) return;
		setOpenSidebarSection(selectedThreadSection);
	}, [selectedThread?.id, selectedThreadSection]);
	useEffect(() => {
		threadSectionsRef.current = new Map(chatThreads.map((thread) => [thread.id, sectionForThread(thread)]));
		const pendingThreadId = pendingIncomingThreadIdRef.current;
		if (!pendingThreadId) return;
		const pendingSection = threadSectionsRef.current.get(pendingThreadId);
		if (!pendingSection) return;
		setOpenSidebarSection(pendingSection);
		pendingIncomingThreadIdRef.current = null;
	}, [chatThreads]);
	const chatInitialLoading = chatDataReady && chatThreads.length === 0 && (threadsLoading || threadsFetching);
	const threadPreviewLabels = {
		deleted: t.workflow.labels.messageDeleted ?? 'Message deleted',
		photo: t.workflow.labels.photoMessage ?? 'Photo',
		attachment: t.workflow.labels.attachmentMessage ?? 'Attachment',
		noMessage: t.workflow.labels.noMessageYet ?? 'No message yet',
		you: t.workflow.labels.you ?? 'You',
	};
	const privateThreadByUserId = (() => {
		const byUserId = new Map<number, ChatThread>();
		chatThreads
			.filter((thread) => thread.kind === 'private')
			.forEach((thread) => {
				const peer = thread.participants.find((user) => user.id !== profile.id);
				if (peer) byUserId.set(peer.id, thread);
			});
		return byUserId;
	})();
	const publicThreads = chatThreads.filter((thread) => thread.kind === 'public');
	const unreadBySection = chatThreads.reduce<Record<ChatSidebarSection, number>>(
		(counts, thread) => {
			counts[sectionForThread(thread)] += Math.max(0, thread.unread_count);
			return counts;
		},
		{ studio: 0, projects: 0, direct: 0 },
	);
	const projectThreadByProjectId = (() => {
		const byProjectId = new Map<number, ChatThread>();
		chatThreads
			.filter((thread) => thread.kind === 'project' && thread.project)
			.forEach((thread) => {
				if (thread.project) byProjectId.set(thread.project.id, thread);
			});
		return byProjectId;
	})();
	const {
		currentData: currentThreadMessages,
		isLoading: messagesLoading,
		isFetching: messagesFetching,
	} = useGetChatMessagesQuery(
		{ threadId: selectedThread?.id ?? 0, limit: PAGE_SIZE, q: searchTerm || undefined, ...searchFilters },
		{ skip: !chatDataReady || !selectedThread?.id },
	);
	const currentMessages = currentThreadMessages ?? EMPTY_CHAT_MESSAGES;
	const [loadOlderMessages] = useLazyGetChatMessagesQuery();
	const [loadActionSource] = useLazyGetChatMessagesQuery();
	const [createThread] = useCreateChatThreadMutation();
	const [sendMessage, sendMessageState] = useSendChatMessageMutation();
	const [createTask, createTaskState] = useCreateTaskMutation();
	const [markRead] = useMarkChatMessageReadMutation();
	const [deleteChatMessage] = useDeleteChatMessageMutation();
	const [editChatMessage] = useEditChatMessageMutation();
	const [reactChatMessage] = useReactChatMessageMutation();
	const [addChatReminder] = useAddChatReminderMutation();
	const { data: projects = [] } = useGetProjectsQuery(undefined, { skip: !chatDataReady });
	const writableProjects = projects.filter((project) => project.can_work && !project.archived);
	const { data: activeTasks = [] } = useGetTasksQuery({ archived: false }, { skip: !chatDataReady });
	const { data: archivedTasks = [] } = useGetTasksQuery({ archived: true }, { skip: !chatDataReady });
	const tasks = (() => {
		const byId = new Map<number, TaskCard>();
		[...activeTasks, ...archivedTasks].forEach((task) => byId.set(task.id, task));
		return Array.from(byId.values());
	})();
	useEffect(() => {
		if (requestedThreadId && (threadsLoading || threadsFetching || requestedThreadAvailable)) return;
		if (
			selectedThread ||
			selectedThreadId ||
			chatInitialLoading ||
			projects.length === 0 ||
			autoStartedProjectThreadRef.current
		)
			return;
		const firstProject = projects[0];
		if (!firstProject) return;
		autoStartedProjectThreadRef.current = true;
		void createThread({ kind: 'project', project_id: firstProject.id })
			.unwrap()
			.then((thread) => {
				setOptimisticSelectedThread(thread);
				setSelectedThreadId(thread.id);
			})
			.catch(() => {
				autoStartedProjectThreadRef.current = false;
			});
	}, [
		chatInitialLoading,
		createThread,
		projects,
		requestedThreadAvailable,
		requestedThreadId,
		selectedThread,
		selectedThreadId,
		threadsFetching,
		threadsLoading,
	]);
	useEffect(() => {
		if (!optimisticSelectedThread) return;
		if (chatThreads.some((thread) => thread.id === optimisticSelectedThread.id)) {
			setOptimisticSelectedThread(null);
		}
	}, [chatThreads, optimisticSelectedThread]);
	useEffect(() => {
		if (!requestedThreadId || selectedThreadId === requestedThreadId) return;
		if (chatThreads.some((thread) => thread.id === requestedThreadId)) {
			setSelectedThreadId(requestedThreadId);
		}
	}, [chatThreads, requestedThreadId, selectedThreadId]);
	const usersResponse = useGetUsersListQuery({ with_pagination: false, is_active: true }, { skip: !chatDataReady });
	const usersRaw = (usersResponse.data ?? []) as
		Array<Partial<UserClass>> | { results?: Array<Partial<UserClass>>; data?: Array<Partial<UserClass>> };
	const users = (Array.isArray(usersRaw) ? usersRaw : (usersRaw.results ?? usersRaw.data ?? []))
		.filter(
			(user): user is WorkflowUser =>
				user.is_active === true && typeof user.id === 'number' && Boolean(user.email) && user.id !== profile.id,
		)
		.map((user) => {
			const croppedAvatar =
				'avatar_cropped' in user && typeof user.avatar_cropped === 'string' ? user.avatar_cropped : null;
			return {
				id: user.id,
				first_name: user.first_name ?? '',
				last_name: user.last_name ?? '',
				email: user.email ?? '',
				role: user.role ?? 'designer',
				avatar: croppedAvatar || (typeof user.avatar === 'string' ? user.avatar : null),
			};
		});
	const currentWorkflowUser: WorkflowUser = {
		id: profile.id,
		first_name: profile.first_name ?? '',
		last_name: profile.last_name ?? '',
		email: profile.email ?? '',
		role: profile.role ?? 'designer',
		avatar:
			(typeof profile.avatar_cropped === 'string' && profile.avatar_cropped) ||
			(typeof profile.avatar === 'string' ? profile.avatar : null),
	};
	const activeUserById = new Map(users.map((user) => [user.id, user]));
	const forwardThreads = chatThreads.filter(
		(thread) =>
			thread.id !== selectedThreadId &&
			(thread.kind !== 'private' ||
				thread.participants.some((participant) => participant.id !== profile.id && activeUserById.has(participant.id))),
	);
	const syncActionSource = useEffectEvent((updated: ChatMessage) => {
		if (updated.thread !== selectedThread?.id) return;
		const matches = (current: ChatMessage | null) =>
			current?.id === updated.id &&
			current.thread === updated.thread &&
			Date.parse(current.updated_at) <= Date.parse(updated.updated_at);
		const replace = (current: ChatMessage | null) => (matches(current) ? updated : current);
		const replaceOrClose = (current: ChatMessage | null) =>
			matches(current) ? (updated.is_deleted ? null : updated) : current;
		setReplyTarget(replaceOrClose);
		setForwardMessage(replaceOrClose);
		setDeleteTargetMessage(replaceOrClose);
		setReminderMessage(replace);
		setTaskSourceMessage(replace);
		if (matches(editingMessage)) {
			// Refresh an untouched editor, but never replace the user's typed draft.
			if (!updated.is_deleted) setEditText((current) => (current === editingMessage?.body ? updated.body : current));
			setEditingMessage(replace);
		}
		setPendingActionSources((current) => {
			if (!current.has(updated.id)) return current;
			const next = new Set(current);
			next.delete(updated.id);
			return next;
		});
	});
	const refreshActionSources = useEffectEvent(() => {
		const sources = [
			replyTarget,
			forwardMessage,
			reminderMessage,
			editingMessage,
			taskSourceMessage,
			deleteTargetMessage,
		].filter((source): source is ChatMessage => !!source && source.thread === selectedThread?.id);
		const uniqueSources = [...new Map(sources.map((source) => [source.id, source])).values()];
		const context = ++actionContextRef.current;
		setPendingActionSources(new Set(uniqueSources.map((source) => source.id)));
		// Sources can be outside the newest page or current search. Fetch each exact
		// message, without changing visible history or replaying pre-reconnect data.
		uniqueSources.forEach((source) => {
			void loadActionSource({ threadId: source.thread, before_id: source.id + 1, limit: 1 })
				.unwrap()
				.then((messages) => {
					if (actionContextRef.current !== context) return;
					const fetched = messages.find((message) => message.id === source.id && message.thread === source.thread);
					const live = historyUpdatesRef.current.get(source.id);
					const updated = live && (!fetched || live.updated_at >= fetched.updated_at) ? live : fetched;
					syncActionSource(updated ?? { ...source, body: '', is_deleted: true });
				})
				.catch(() => {
					// Keep actions disabled on an unverified source; retain typed drafts.
					if (actionContextRef.current === context) onError(t.errors.genericError);
				});
		});
	});
	useEffect(() => {
		actionContextRef.current += 1;
		setPendingActionSources(new Set());
		setReplyTarget(null);
		setForwardMessage(null);
		setReminderMessage(null);
		setEditingMessage(null);
		setTaskSourceMessage(null);
		setDeleteTargetMessage(null);
		setTaskModalOpen(false);
		return () => {
			actionContextRef.current += 1;
		};
	}, [selectedThread?.id]);
	useEffect(() => {
		currentMessages.forEach((message) => {
			if (message.thread !== selectedThread?.id) return;
			const live = historyUpdatesRef.current.get(message.id);
			syncActionSource(live && live.updated_at >= message.updated_at ? live : message);
		});
	}, [currentMessages, selectedThread?.id]);
	useEffect(() => {
		const pendingRequestedThread = requestedThreadId && (threadsLoading || threadsFetching || requestedThreadAvailable);
		if (!selectedThreadId && !pendingRequestedThread && preferredThread) {
			setSelectedThreadId(preferredThread.id);
		}
	}, [preferredThread, requestedThreadAvailable, requestedThreadId, selectedThreadId, threadsFetching, threadsLoading]);
	useEffect(() => {
		historyContextRef.current += 1;
		olderRequestRef.current = null;
		historyUpdatesRef.current.clear();
		historyExpandedRef.current = false;
		currentPageSnapshotRef.current = null;
		setOlderMessages([]);
		setLoadingOlder(false);
		setHasOlder(false);
		setTypingUsers({});
		Object.values(typingPresenceTimeoutsRef.current).forEach((timeout) => window.clearTimeout(timeout));
		typingPresenceTimeoutsRef.current = {};
		setRecordingUsers({});
		Object.values(recordingPresenceTimeoutsRef.current).forEach((timeout) => window.clearTimeout(timeout));
		recordingPresenceTimeoutsRef.current = {};
		setReactionPickerMessageId(null);
		markedReadIdsRef.current.clear();
		return () => {
			historyContextRef.current += 1;
		};
	}, [selectedThread?.id, searchTerm, searchFilters]);
	useEffect(() => {
		const context = historyContextRef.current;
		const previous = currentPageSnapshotRef.current;
		currentPageSnapshotRef.current = { context, messages: currentMessages };
		if (historyExpandedRef.current && previous?.context === context) {
			// A refetched newest page slides forward when a message arrives. Keep its
			// displaced entries beside loaded history so no gap appears between pages.
			const currentIds = new Set(currentMessages.map((message) => message.id));
			const oldestCurrentId = currentMessages[0]?.id ?? 0;
			const displaced = previous.messages
				.filter((message) => message.id < oldestCurrentId && !currentIds.has(message.id))
				.map((message) => historyUpdatesRef.current.get(message.id) ?? message);
			if (displaced.length)
				setOlderMessages((current) =>
					context === historyContextRef.current ? dedupeMessages([...displaced, ...current]) : current,
				);
		} else {
			setHasOlder(currentMessages.length >= PAGE_SIZE);
		}
	}, [currentMessages, selectedThread?.id, searchTerm, searchFilters]);
	const latestCurrentMessageId = currentMessages[currentMessages.length - 1]?.id ?? 0;
	useEffect(() => {
		if (!selectedThread?.id || searchTerm || olderMessages.length) return;
		const scrollToBottom = () => {
			if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		};
		const frame = requestAnimationFrame(scrollToBottom);
		const timeout = window.setTimeout(scrollToBottom, 80);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timeout);
		};
	}, [currentMessages.length, latestCurrentMessageId, olderMessages.length, searchTerm, selectedThread?.id]);
	const releaseFilePreviews = useEffectEvent(() => {
		filePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
	});
	useEffect(() => () => releaseFilePreviews(), []);
	useEffect(() => {
		if (!recording) {
			setRecordingSeconds(0);
			return undefined;
		}
		const startedAt = Date.now();
		const timer = window.setInterval(() => {
			setRecordingSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
		}, 300);
		return () => window.clearInterval(timer);
	}, [recording]);
	const receiveSocketEvent = useEffectEvent((payload: unknown) => {
		if (!isSocketRecord(payload)) return;
		const envelope = isSocketRecord(payload.message) ? payload.message : undefined;
		const signalType = typeof envelope?.type === 'string' ? envelope.type : payload.type;
		const incomingMessage = isSocketRecord(envelope?.message) ? envelope.message : envelope;
		const incomingThreadId = Number(payload.thread_id ?? incomingMessage?.thread ?? 0);
		const incomingSender = isSocketRecord(incomingMessage?.sender) ? incomingMessage.sender : undefined;
		const incomingSenderId = Number(incomingSender?.id ?? 0);
		if (
			signalType === 'reconnected' ||
			signalType === 'USER_AVATAR' ||
			(signalType === 'WORKFLOW_EVENT' && ['users', 'admin'].includes(String(envelope?.scope ?? payload.scope)))
		) {
			// The shared saga reloads queries. Discard offline or outdated-user snapshots.
			historyContextRef.current += 1;
			olderRequestRef.current = null;
			historyUpdatesRef.current.clear();
			historyExpandedRef.current = false;
			currentPageSnapshotRef.current = { context: historyContextRef.current, messages: currentMessages };
			setOlderMessages([]);
			setLoadingOlder(false);
			setHasOlder(currentMessages.length >= PAGE_SIZE);
			markedReadIdsRef.current.clear();
			setTypingUsers({});
			setRecordingUsers({});
			refreshActionSources();
			return;
		}
		if (
			(signalType === 'chat.message' || signalType === 'chat_message') &&
			incomingThreadId &&
			incomingSenderId !== profile.id
		) {
			pendingIncomingThreadIdRef.current = incomingThreadId;
			const incomingSection = threadSectionsRef.current.get(incomingThreadId);
			if (incomingSection) {
				setOpenSidebarSection(incomingSection);
				pendingIncomingThreadIdRef.current = null;
			}
		}
		const eventUser =
			isSocketRecord(payload.user) && typeof payload.user.id === 'number' ? (payload.user as WorkflowUser) : undefined;
		if (
			(signalType === 'chat.typing' || signalType === 'chat_typing') &&
			payload.thread_id === selectedThread?.id &&
			eventUser?.id !== profile.id
		) {
			const typingUser = eventUser;
			if (!typingUser?.id) return;
			const existingTimeout = typingPresenceTimeoutsRef.current[typingUser.id];
			if (existingTimeout) window.clearTimeout(existingTimeout);
			if (payload.is_typing) {
				setTypingUsers((current) => ({ ...current, [typingUser.id]: typingUser }));
				typingPresenceTimeoutsRef.current[typingUser.id] = window.setTimeout(() => {
					setTypingUsers((current) => {
						const next = { ...current };
						delete next[typingUser.id];
						return next;
					});
					delete typingPresenceTimeoutsRef.current[typingUser.id];
				}, 2400);
			} else {
				delete typingPresenceTimeoutsRef.current[typingUser.id];
				setTypingUsers((current) => {
					const next = { ...current };
					delete next[typingUser.id];
					return next;
				});
			}
			return;
		}
		if (
			(signalType === 'chat.recording' || signalType === 'chat_recording') &&
			payload.thread_id === selectedThread?.id &&
			eventUser?.id !== profile.id
		) {
			const recordingUser = eventUser;
			if (!recordingUser?.id) return;
			if (payload.is_recording) {
				setRecordingUsers((current) => ({ ...current, [recordingUser.id]: recordingUser }));
				const existingTimeout = recordingPresenceTimeoutsRef.current[recordingUser.id];
				if (existingTimeout) window.clearTimeout(existingTimeout);
				recordingPresenceTimeoutsRef.current[recordingUser.id] = window.setTimeout(() => {
					setRecordingUsers((current) => {
						const next = { ...current };
						delete next[recordingUser.id];
						return next;
					});
					delete recordingPresenceTimeoutsRef.current[recordingUser.id];
				}, 3600);
			} else {
				const existingTimeout = recordingPresenceTimeoutsRef.current[recordingUser.id];
				if (existingTimeout) window.clearTimeout(existingTimeout);
				delete recordingPresenceTimeoutsRef.current[recordingUser.id];
				setRecordingUsers((current) => {
					const next = { ...current };
					delete next[recordingUser.id];
					return next;
				});
			}
			return;
		}
		if (
			[
				'chat.message',
				'chat.read',
				'chat.deleted',
				'chat.updated',
				'chat.reaction',
				'chat.decision',
				'chat.reminder',
				'chat_message',
				'chat_read',
				'chat_deleted',
				'chat_updated',
				'chat_reaction',
				'chat_decision',
				'chat_reminder',
			].includes(String(signalType)) &&
			incomingThreadId === selectedThread?.id &&
			incomingMessage &&
			typeof incomingMessage.id === 'number' &&
			typeof incomingMessage.body === 'string' &&
			Array.isArray(incomingMessage.attachments)
		) {
			const updated = incomingMessage as ChatMessage;
			const previous = historyUpdatesRef.current.get(updated.id);
			if (previous && Date.parse(previous.updated_at) > Date.parse(updated.updated_at)) return;
			historyUpdatesRef.current.set(updated.id, updated);
			setOlderMessages((current) => current.map((message) => (message.id === updated.id ? updated : message)));
			syncActionSource(updated);
		}
	});
	useEffect(() => {
		if (!chatDataReady) return;
		return subscribeWorkflowSocket((payload) => receiveSocketEvent(payload));
	}, [chatDataReady]);
	useEffect(
		() => () => {
			if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
			Object.values(typingPresenceTimeoutsRef.current).forEach((timeout) => window.clearTimeout(timeout));
			Object.values(recordingPresenceTimeoutsRef.current).forEach((timeout) => window.clearTimeout(timeout));
			if (messagesBusyTimeoutRef.current) window.clearTimeout(messagesBusyTimeoutRef.current);
		},
		[],
	);
	useEffect(
		() => () => {
			recordingRequestRef.current = null;
			const recorder = mediaRecorderRef.current;
			mediaRecorderRef.current = null;
			if (!recorder) return;
			recorder.onstop = null;
			recorder.ondataavailable = null;
			if (recorder.state !== 'inactive') recorder.stop();
			recorder.stream.getTracks().forEach((track) => track.stop());
			setRecording(false);
			if (selectedThread?.id)
				sendWorkflowSocket({ type: 'chat.recording', thread_id: selectedThread.id, is_recording: false });
		},
		[selectedThread?.id],
	);
	const messageList = dedupeMessages([...olderMessages, ...currentMessages]);
	const immediateMessagesBusy = Boolean(
		selectedThread?.id &&
		currentThreadMessages === undefined &&
		(messagesLoading || messagesFetching) &&
		messageList.length === 0,
	);
	useEffect(() => {
		if (messagesBusyTimeoutRef.current) window.clearTimeout(messagesBusyTimeoutRef.current);
		if (immediateMessagesBusy) {
			messagesBusyTimeoutRef.current = window.setTimeout(() => {
				setMessagesBusyVisible(true);
				messagesBusyTimeoutRef.current = null;
			}, MESSAGE_SPINNER_SHOW_DELAY_MS);
			return () => {
				if (messagesBusyTimeoutRef.current) {
					window.clearTimeout(messagesBusyTimeoutRef.current);
					messagesBusyTimeoutRef.current = null;
				}
			};
		}
		messagesBusyTimeoutRef.current = window.setTimeout(() => {
			setMessagesBusyVisible(false);
			messagesBusyTimeoutRef.current = null;
		}, MESSAGE_SPINNER_HIDE_DELAY_MS);
		return () => {
			if (messagesBusyTimeoutRef.current) {
				window.clearTimeout(messagesBusyTimeoutRef.current);
				messagesBusyTimeoutRef.current = null;
			}
		};
	}, [immediateMessagesBusy]);
	const messagesBusy = messagesBusyVisible && messageList.length === 0;
	const threadPreviewFor = (thread: ChatThread) => {
		const latestSelectedMessage =
			selectedThread?.id === thread.id ? (messageList[messageList.length - 1] ?? null) : null;
		return threadPreview(
			thread.last_message ? thread : { ...thread, last_message: latestSelectedMessage },
			profile.id,
			threadPreviewLabels,
			tasks,
			projects,
		);
	};
	const messageMentionUsers = (() => {
		const byId = new Map<number, WorkflowUser>();
		[currentWorkflowUser, ...users].forEach((user) => byId.set(user.id, user));
		messageList.forEach((message) => {
			byId.set(message.sender.id, message.sender);
			message.mentions.forEach((user) => byId.set(user.id, user));
		});
		return Array.from(byId.values());
	})();
	const linkedReferences = (() => {
		const taskIds = new Set<number>();
		const projectIds = new Set<number>();
		messageList.forEach((message) => {
			const refs = extractReferenceIds(message.body, tasks, projects);
			refs.taskIds.forEach((id) => taskIds.add(id));
			refs.projectIds.forEach((id) => projectIds.add(id));
		});
		const referencedTasks = tasks.filter((task) => taskIds.has(task.id));
		referencedTasks.forEach((task) => projectIds.add(task.project.id));
		return {
			tasks: referencedTasks,
			projects: projects.filter((project) => projectIds.has(project.id)),
		};
	})();
	const linkedReferenceCount = linkedReferences.tasks.length + linkedReferences.projects.length;
	const firstUnreadMessageId =
		messageList.find(
			(message) => message.sender.id !== profile.id && !message.read_by.some((user) => user.id === profile.id),
		)?.id ?? null;
	const mediaAttachments = messageList.flatMap((message) =>
		message.attachments.map((attachment) => ({ message, attachment })),
	);
	const previewTask = previewTarget?.kind === 'task' ? tasks.find((task) => task.id === previewTarget.id) : undefined;
	const previewProject =
		previewTarget?.kind === 'project' ? projects.find((project) => project.id === previewTarget.id) : undefined;
	const typingNames = Object.values(typingUsers).map(userLabel).join(', ');
	const recordingNames = Object.values(recordingUsers).map(userLabel).join(', ');
	const activeChatFilterCount = [
		searchTerm.trim(),
		searchFilters.sender_id,
		searchFilters.date_from,
		searchFilters.has_files,
		searchFilters.has_images,
	].filter(Boolean).length;
	useEffect(() => {
		const unreadMessages = messageList.filter(
			(message) =>
				message.sender.id !== profile.id &&
				!message.read_by.some((user) => user.id === profile.id) &&
				!markedReadIdsRef.current.has(message.id),
		);
		unreadMessages.forEach((message) => {
			markedReadIdsRef.current.add(message.id);
			void markRead(message.id);
		});
	}, [markRead, messageList, profile.id]);
	const loadMoreHistory = async (preserveScroll = false) => {
		const oldest = messageList[0];
		if (!oldest || !selectedThread?.id || !hasOlder || olderRequestRef.current) return;
		const request = { context: historyContextRef.current };
		olderRequestRef.current = request;
		historyExpandedRef.current = true;
		setLoadingOlder(true);
		const scroller = scrollRef.current;
		const previousHeight = scroller?.scrollHeight ?? 0;
		try {
			const older = await loadOlderMessages({
				threadId: selectedThread.id,
				before_id: oldest.id,
				limit: PAGE_SIZE,
				q: searchTerm || undefined,
				...searchFilters,
			}).unwrap();
			if (request.context !== historyContextRef.current || olderRequestRef.current !== request) return;
			const refreshed = older.map((message) => historyUpdatesRef.current.get(message.id) ?? message);
			setOlderMessages((current) => dedupeMessages([...refreshed, ...current]));
			setHasOlder(older.length >= PAGE_SIZE);
			if (preserveScroll)
				requestAnimationFrame(() => {
					if (request.context === historyContextRef.current && scroller && scrollRef.current === scroller) {
						scroller.scrollTop = scroller.scrollHeight - previousHeight;
					}
				});
		} catch (error) {
			if (request.context === historyContextRef.current) onError(extractApiErrorMessage(error, t.errors.genericError));
		} finally {
			if (olderRequestRef.current === request) {
				olderRequestRef.current = null;
				setLoadingOlder(false);
			}
		}
	};
	const loadHistoryOnScroll = useEffectEvent(() => {
		if (scrollRef.current && scrollRef.current.scrollTop <= 40) void loadMoreHistory(true);
	});
	useEffect(() => {
		const scroller = scrollRef.current;
		if (!scroller || !selectedThread?.id || !hasOlder || loadingOlder || searchTerm) return;
		const onScroll = () => loadHistoryOnScroll();
		scroller.addEventListener('scroll', onScroll);
		return () => scroller.removeEventListener('scroll', onScroll);
	}, [hasOlder, loadingOlder, searchTerm, selectedThread?.id]);
	const composerTrigger = body.match(/(^|\s)([@#])([\w:.-]*)$/);
	const mentionMatch = composerTrigger?.[2] === '@' ? composerTrigger : null;
	const referenceMatch = composerTrigger?.[2] === '#' ? composerTrigger : null;
	const mentionOptions = (() => {
		if (!mentionMatch) return [];
		const query = mentionMatch[3].toLowerCase();
		return users
			.filter((user) => {
				const localPart = user.email.split('@', 1)[0].toLowerCase();
				return (
					!query ||
					user.first_name.toLowerCase().includes(query) ||
					user.last_name.toLowerCase().includes(query) ||
					localPart.includes(query)
				);
			})
			.slice(0, 6);
	})();
	const referenceOptions = (() => {
		if (!referenceMatch) return [];
		const query = referenceMatch[3].toLowerCase();
		const projectOptions = projects
			.filter((project) => !query || project.name.toLowerCase().includes(query))
			.slice(0, 4)
			.map((project) => ({ kind: 'project' as const, id: project.id, title: project.name, meta: project.status }));
		const taskOptions = activeTasks
			.filter((task) => {
				const haystack = `${task.title} ${task.project.name} ${task.status}`.toLowerCase();
				return !query || haystack.includes(query);
			})
			.slice(0, 5)
			.map((task) => ({ kind: 'task' as const, id: task.id, title: task.title, meta: task.project.name }));
		return [...taskOptions, ...projectOptions].slice(0, 8);
	})();
	const mentionTriggerText = mentionMatch?.[0] ?? '';
	const referenceTriggerText = referenceMatch?.[0] ?? '';
	useEffect(() => {
		setMentionActiveIndex(0);
	}, [mentionTriggerText, mentionOptions.length]);
	useEffect(() => {
		setReferenceActiveIndex(0);
	}, [referenceTriggerText, referenceOptions.length]);
	const groupedMessages = (() => {
		const groups: Array<{ day: string; items: ChatMessage[] }> = [];
		messageList.forEach((message) => {
			const day = new Date(message.created_at).toDateString();
			const group = groups[groups.length - 1];
			if (!group || group.day !== day) {
				groups.push({ day, items: [message] });
				return;
			}
			group.items.push(message);
		});
		return groups;
	})();
	const resetFiles = () => {
		filePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
		setFilePreviewUrls([]);
		setFiles([]);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};
	const submit = async () => {
		if (!selectedThread?.id || sendMessageState.isLoading || (!body.trim() && files.length === 0)) return;
		if (replyTarget && (replyTarget.thread !== selectedThread.id || pendingActionSources.has(replyTarget.id))) return;
		if (attachmentsExceedLimit(files)) {
			onError(t.errors.attachmentTooLarge);
			return;
		}
		const data = new FormData();
		data.append('body', body.trim());
		if (replyTarget) data.append('reply_to_id', String(replyTarget.id));
		files.forEach((file) => data.append('files', file));
		if (files.length) setAttachmentUploadProgress(0);
		try {
			await sendMessage({
				threadId: selectedThread.id,
				data,
				onUploadProgress: files.length
					? ({ loaded, total }) =>
							setAttachmentUploadProgress(
								Math.min(100, Math.round((loaded / (total || files.reduce((sum, file) => sum + file.size, 0))) * 100)),
							)
					: undefined,
			}).unwrap();
		} catch (error) {
			onError(extractApiErrorMessage(error, t.errors.genericError));
			return;
		} finally {
			setAttachmentUploadProgress(null);
		}
		setBody('');
		emitTyping(false);
		setReplyTarget(null);
		resetFiles();
		requestAnimationFrame(() => {
			if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		});
	};
	const insertMention = (user: WorkflowUser) => {
		setBody((current) => current.replace(/(^|\s)@([\w.-]*)$/, `$1@${mentionTokenFor(user)} `));
	};
	const insertReference = (reference: { kind: 'task' | 'project'; id: number; title?: string }) => {
		const token = referenceTokenFor(reference.title ?? `${reference.kind}-${reference.id}`);
		setBody((current) => current.replace(/(^|\s)#([\w:.-]*)$/, `$1${token} `));
	};
	const startPrivateThread = async (user: WorkflowUser) => {
		if (user.id === profile.id) return;
		const existing = privateThreadByUserId.get(user.id);
		if (existing) {
			setSelectedThreadId(existing.id);
			return;
		}
		const thread = await createThread({ kind: 'private', recipient_id: user.id }).unwrap();
		setOptimisticSelectedThread(thread);
		setSelectedThreadId(thread.id);
	};
	const startProjectThread = async (project: ProjectSummary) => {
		const existing = projectThreadByProjectId.get(project.id);
		if (existing) {
			setSelectedThreadId(existing.id);
			return;
		}
		const thread = await createThread({ kind: 'project', project_id: project.id }).unwrap();
		setOptimisticSelectedThread(thread);
		setSelectedThreadId(thread.id);
	};
	const emitTyping = (isTyping = true) => {
		if (!selectedThread?.id) return;
		const threadId = selectedThread.id;
		if (!sendWorkflowSocket({ type: 'chat.typing', thread_id: threadId, is_typing: isTyping })) return;
		if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
		if (isTyping) {
			typingTimeoutRef.current = window.setTimeout(() => {
				sendWorkflowSocket({ type: 'chat.typing', thread_id: threadId, is_typing: false });
				typingTimeoutRef.current = null;
			}, 1400);
		} else {
			typingTimeoutRef.current = null;
		}
	};
	const emitRecording = (isRecording: boolean) => {
		if (!selectedThread?.id) return;
		sendWorkflowSocket({ type: 'chat.recording', thread_id: selectedThread.id, is_recording: isRecording });
	};
	const submitEdit = async () => {
		if (!editingMessage || editingMessage.is_deleted || pendingActionSources.has(editingMessage.id) || !editText.trim())
			return;
		await editChatMessage({ id: editingMessage.id, body: editText.trim() }).unwrap();
		setEditingMessage(null);
		setEditText('');
	};
	const forwardToThread = async (thread: ChatThread) => {
		if (!forwardMessage || forwardMessage.is_deleted || pendingActionSources.has(forwardMessage.id)) return;
		const readableBody =
			readableReferenceText(forwardMessage.body, tasks, projects) || forwardMessage.attachments[0]?.name || '';
		const data = new FormData();
		data.append('body', readableBody);
		await sendMessage({ threadId: thread.id, data }).unwrap();
		setForwardMessage(null);
	};
	useEffect(() => {
		highlightedMessageKeyRef.current = null;
	}, [requestedMessageKey]);
	useEffect(() => {
		if (!requestedMessageId || !requestedMessageKey || highlightedMessageKeyRef.current === requestedMessageKey) return;
		if (requestedThreadId && selectedThread?.id !== requestedThreadId) return;
		if (!messageList.some((message) => message.id === requestedMessageId)) return;
		const timeout = window.setTimeout(() => {
			scrollToMessage(requestedMessageId);
			highlightedMessageKeyRef.current = requestedMessageKey;
		}, 120);
		return () => window.clearTimeout(timeout);
	}, [messageList, requestedMessageId, requestedMessageKey, requestedThreadId, selectedThread?.id]);
	useEffect(() => {
		if (reactionPickerMessageId === null) return;
		const closeReactionPicker = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Element && target.closest('.workflow-chat-reaction-menu')) return;
			setReactionPickerMessageId(null);
		};
		const closeReactionPickerOnFocus = (event: FocusEvent) => {
			const target = event.target;
			if (target instanceof Element && target.closest('.workflow-chat-reaction-menu')) return;
			setReactionPickerMessageId(null);
		};
		const closeReactionPickerOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setReactionPickerMessageId(null);
		};
		document.addEventListener('pointerdown', closeReactionPicker, true);
		document.addEventListener('focusin', closeReactionPickerOnFocus, true);
		document.addEventListener('keydown', closeReactionPickerOnEscape, true);
		return () => {
			document.removeEventListener('pointerdown', closeReactionPicker, true);
			document.removeEventListener('focusin', closeReactionPickerOnFocus, true);
			document.removeEventListener('keydown', closeReactionPickerOnEscape, true);
		};
	}, [reactionPickerMessageId]);
	const openReminder = (message: ChatMessage) => {
		const refs = linkedReferencesForBody(message.body, tasks, projects);
		const task = refs.tasks[0];
		setReminderMessage(message);
		setReminderDraft({
			taskId: task ? String(task.id) : '',
			remindDate: task?.due_date ?? '',
			remindTime: task?.due_date ? '09:00' : '',
			note: '',
		});
	};
	const submitReminder = async () => {
		if (!reminderMessage || reminderMessage.is_deleted || pendingActionSources.has(reminderMessage.id)) return;
		await addChatReminder({
			id: reminderMessage.id,
			task_id: reminderDraft.taskId ? Number(reminderDraft.taskId) : null,
			remind_at:
				reminderDraft.remindDate && reminderDraft.remindTime
					? new Date(`${reminderDraft.remindDate}T${reminderDraft.remindTime}`).toISOString()
					: null,
			note: reminderDraft.note,
		}).unwrap();
		setReminderMessage(null);
		setReminderDraft({ taskId: '', remindDate: '', remindTime: '', note: '' });
	};
	const stopVoiceRecording = (discard = false) => {
		discardRecordingRef.current = discard;
		emitRecording(false);
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== 'inactive') recorder.stop();
		setRecording(false);
	};
	const toggleVoiceRecording = async () => {
		if (recording) {
			stopVoiceRecording(false);
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia || recordingRequestRef.current) return;
		const request = {};
		recordingRequestRef.current = request;
		let stream: MediaStream | undefined;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			if (recordingRequestRef.current !== request) {
				stream.getTracks().forEach((track) => track.stop());
				return;
			}
			const chunks: BlobPart[] = [];
			discardRecordingRef.current = false;
			const recorder = new MediaRecorder(stream);
			mediaRecorderRef.current = recorder;
			recorder.ondataavailable = (event) => {
				if (event.data.size) chunks.push(event.data);
			};
			recorder.onstop = () => {
				recorder.stream.getTracks().forEach((track) => track.stop());
				if (mediaRecorderRef.current !== recorder) return;
				mediaRecorderRef.current = null;
				if (discardRecordingRef.current) return;
				const mimeType = recorder.mimeType || 'audio/webm';
				const blob = new Blob(chunks, { type: mimeType });
				const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
				const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: mimeType });
				const previewUrl = URL.createObjectURL(file);
				setFiles((current) => [...current, file]);
				setFilePreviewUrls((current) => [...current, previewUrl]);
			};
			recorder.start();
			setRecording(true);
			emitRecording(true);
		} catch (error) {
			stream?.getTracks().forEach((track) => track.stop());
			if (recordingRequestRef.current === request) {
				mediaRecorderRef.current = null;
				onError(extractApiErrorMessage(error, t.errors.genericError));
			}
		} finally {
			if (recordingRequestRef.current === request) recordingRequestRef.current = null;
		}
	};
	const confirmDeleteMessage = async () => {
		if (!deleteTargetMessage || deleteTargetMessage.is_deleted || pendingActionSources.has(deleteTargetMessage.id))
			return;
		await deleteChatMessage(deleteTargetMessage.id).unwrap();
		setDeleteTargetMessage(null);
	};
	const openCreateTaskFromMessage = (message: ChatMessage) => {
		if (writableProjects.length === 0) return;
		setTaskSourceMessage(message);
		setTaskDraft({
			title: '',
			description: '',
			projectId: '',
		});
		setTaskModalOpen(true);
	};
	const openCreateTaskFromSelection = () => {
		const selectedText = selectedComposerText.trim();
		if (!selectedText || writableProjects.length === 0) return;
		setTaskSourceMessage(null);
		setTaskDraft({
			title: '',
			description: '',
			projectId: '',
		});
		setTaskModalOpen(true);
	};
	const submitTaskFromMessage = async () => {
		const projectId = Number(taskDraft.projectId);
		if (taskSourceMessage && (taskSourceMessage.is_deleted || pendingActionSources.has(taskSourceMessage.id))) return;
		if (!projectId || !taskDraft.title.trim() || !writableProjects.some((project) => project.id === projectId)) return;
		const createdTask = await createTask({
			project_id: projectId,
			title: taskDraft.title.trim(),
			description: taskDraft.description.trim(),
			current_assignee_id: typeof profile.id === 'number' ? profile.id : null,
			status: 'backlog',
			priority: 'medium',
			due_date: detectDueDate(taskDraft.description),
			estimated_minutes: WORK_DAY_MINUTES,
			source_chat_message_id: taskSourceMessage?.id ?? null,
		}).unwrap();
		setTaskModalOpen(false);
		setTaskSourceMessage(null);
		setBody((current) => `${current.trim()} ${referenceTokenFor(createdTask.title)} `.trimStart());
		setSelectedComposerText('');
	};
	const removeSelectedFile = (index: number) => {
		const removed = filePreviewUrls[index];
		if (removed) URL.revokeObjectURL(removed);
		setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
		setFilePreviewUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
	};
	const actionSourcePreview = (source: ChatMessage) =>
		pendingActionSources.has(source.id)
			? t.common.loading
			: source.is_deleted
				? (t.workflow.labels.messageDeleted ?? 'Message deleted')
				: readableReferenceText(source.body, tasks, projects);
	return {
		t,
		openSidebarSection,
		setOpenSidebarSection,
		publicThreads,
		unreadBySection,
		threadPreviewFor,
		setSelectedThreadId,
		selectedThread,
		profile,
		projects,
		projectThreadByProjectId,
		startProjectThread,
		users,
		privateThreadByUserId,
		createThread,
		setOptimisticSelectedThread,
		onlineUserIds,
		messageList,
		chatToolsOpen,
		setChatToolsOpen,
		activeChatFilterCount,
		searchTerm,
		setSearchTerm,
		searchFilters,
		setSearchFilters,
		messageMentionUsers,
		setDrawerMode,
		setReferencesOpen,
		linkedReferenceCount,
		mediaAttachments,
		scrollRef,
		hasOlder,
		loadingOlder,
		loadMoreHistory,
		chatInitialLoading,
		messagesBusy,
		groupedMessages,
		locale,
		tasks,
		replyTarget,
		firstUnreadMessageId,
		startPrivateThread,
		setReplyTarget,
		composerInputRef,
		setReactionPickerMessageId,
		reactionPickerMessageId,
		reactChatMessage,
		openReminder,
		setForwardMessage,
		writableProjects,
		openCreateTaskFromMessage,
		setEditingMessage,
		setEditText,
		setDeleteTargetMessage,
		editingMessage,
		pendingActionSources,
		actionSourcePreview,
		editText,
		submitEdit,
		setPreviewTarget,
		setSelectedImage,
		typingNames,
		recordingNames,
		recording,
		stopVoiceRecording,
		recordingSeconds,
		fileInputRef,
		sendMessageState,
		onError,
		resetFiles,
		setFiles,
		setFilePreviewUrls,
		toggleVoiceRecording,
		body,
		setBody,
		emitTyping,
		setSelectedComposerText,
		mentionOptions,
		setMentionActiveIndex,
		mentionMatch,
		insertMention,
		mentionActiveIndex,
		referenceOptions,
		setReferenceActiveIndex,
		referenceMatch,
		insertReference,
		referenceActiveIndex,
		files,
		submit,
		statusLabelFor,
		selectedComposerText,
		openCreateTaskFromSelection,
		attachmentUploadProgress,
		filePreviewUrls,
		removeSelectedFile,
		referencesOpen,
		drawerMode,
		linkedReferences,
		previewTarget,
		previewTask,
		previewProject,
		forwardMessage,
		forwardThreads,
		activeUserById,
		forwardToThread,
		reminderMessage,
		setReminderMessage,
		submitReminder,
		reminderDraft,
		setReminderDraft,
		taskModalOpen,
		setTaskModalOpen,
		submitTaskFromMessage,
		taskSourceMessage,
		taskDraft,
		setTaskDraft,
		createTaskState,
		selectedImage,
		deleteTargetMessage,
		confirmDeleteMessage,
	};
};
export type ChatController = ReturnType<typeof useChatController>;
