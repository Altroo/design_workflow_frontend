'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, AlertTriangle, ArrowDown, BriefcaseBusiness, CalendarDays, CheckCheck, CheckSquare2, Edit3, Eye, FileText, Forward, ImageIcon, Images, MessagesSquare, Mic, MoreHorizontal, Paperclip, Pause, Play, Reply, Search, Send, SlidersHorizontal, SmilePlus, Square, ThumbsUp, Trash2, Users, X } from 'lucide-react';
import {
	useAddChatReminderMutation,
	useCreateChatThreadMutation,
	useCreateTaskMutation,
	useDeleteChatMessageMutation,
	useEditChatMessageMutation,
	useGetProjectsQuery,
	useGetChatMessagesQuery,
	useGetChatThreadsQuery,
	useGetTasksQuery,
	useLazyGetChatMessagesQuery,
	useMarkChatDecisionMutation,
	useMarkChatMessageReadMutation,
	useReactChatMessageMutation,
	useSendChatMessageMutation,
} from '@/store/services/designWorkflow';
import { useGetUsersListQuery } from '@/store/services/account';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getAccessToken, getProfilState } from '@/store/selectors';
import { DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';
import type { ChatMessage, ChatThread, ProjectSummary, TaskCard, WorkflowUser } from '@/types/designWorkflowTypes';
import type { UserClass } from '@/models/classes';
import { WorkflowPageHero, WorkflowPanelPill } from '@/components/shared/workflow/workflowPrimitives';
import { WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const WS_URL = API_URL.replace(/^http/, 'ws');
const PAGE_SIZE = 40;
const REACTION_OPTIONS = [
	{ emoji: '\u2705', label: 'Done', Icon: CheckCheck },
	{ emoji: '\ud83d\udc40', label: 'Seen', Icon: Eye },
	{ emoji: '\ud83d\udc4d', label: 'Approved', Icon: ThumbsUp },
	{ emoji: '\u26a0\ufe0f', label: 'Attention', Icon: AlertTriangle },
] as const;
const OTHER_BUBBLE_COLORS = [
	'border-[color:var(--line)] bg-white',
	'border-[color:var(--line)] bg-white',
	'border-[color:var(--line)] bg-white',
	'border-[color:var(--line)] bg-white',
	'border-[color:var(--line)] bg-white',
];

const formatTime = (value: string, locale: string) =>
	new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const formatAudioDuration = (value: number) => {
	if (!Number.isFinite(value) || value <= 0) return '0:00';
	const minutes = Math.floor(value / 60);
	const seconds = Math.floor(value % 60).toString().padStart(2, '0');
	return `${minutes}:${seconds}`;
};

const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	return `${API_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const isImageAttachment = (mimeType: string, name: string, url?: string | null) =>
	mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || url || '');
const isAudioAttachment = (mimeType: string, name: string, url?: string | null) =>
	mimeType.startsWith('audio/') || /\.(webm|mp3|m4a|wav|ogg|oga|aac)$/i.test(name || url || '');

const fileIconLabel = (name: string) => name.split('.').pop()?.toUpperCase() || 'FILE';

const userLabel = (user: WorkflowUser) => `${user.first_name} ${user.last_name}`.trim() || user.email;
const mentionTokenFor = (user: WorkflowUser) => user.email.split('@', 1)[0].toLowerCase();
const referenceSlugFor = (title: string) =>
	title
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64) || 'reference';
const referenceTokenFor = (title: string) => `#${referenceSlugFor(title)}`;
const extractReferenceIds = (body: string, tasks: TaskCard[] = [], projects: ProjectSummary[] = []) => {
	const taskIds = Array.from(body.matchAll(/#T(\d+)/gi), (match) => Number(match[1])).filter(Number.isFinite);
	const projectIds = Array.from(body.matchAll(/#P(\d+)/gi), (match) => Number(match[1])).filter(Number.isFinite);
	const taskByToken = new Map(tasks.map((task) => [referenceTokenFor(task.title).toLowerCase(), task.id]));
	const projectByToken = new Map(projects.map((project) => [referenceTokenFor(project.name).toLowerCase(), project.id]));
	Array.from(body.matchAll(/#[\w-]+/g), (match) => match[0].toLowerCase()).forEach((token) => {
		if (/^#(?:t|p)\d+$/i.test(token)) return;
		const taskId = taskByToken.get(token);
		const projectId = projectByToken.get(token);
		if (taskId) taskIds.push(taskId);
		if (projectId) projectIds.push(projectId);
	});
	return { taskIds, projectIds };
};
const readableReferenceText = (body: string, tasks: TaskCard[] = [], projects: ProjectSummary[] = []) => {
	const taskById = new Map(tasks.map((task) => [task.id, task]));
	const projectById = new Map(projects.map((project) => [project.id, project]));
	const taskByToken = new Map(tasks.map((task) => [referenceTokenFor(task.title).toLowerCase(), task]));
	const projectByToken = new Map(projects.map((project) => [referenceTokenFor(project.name).toLowerCase(), project]));
	return body
		.replace(/#(?:T\d+|P\d+|[\w-]+)/gi, (token) => {
			const lower = token.toLowerCase();
			const taskId = lower.match(/^#t(\d+)$/)?.[1];
			const projectId = lower.match(/^#p(\d+)$/)?.[1];
			const task = taskId ? taskById.get(Number(taskId)) : taskByToken.get(lower);
			const project = projectId ? projectById.get(Number(projectId)) : projectByToken.get(lower);
			return task?.title ?? project?.name ?? token;
		})
		.replace(/\s+/g, ' ')
		.trim();
};
const cleanMessageForTask = (body: string) => body.replace(/#(?:T|P)\d+/gi, '').replace(/#[\w-]+/g, '').replace(/@\w[\w.-]*/g, '').replace(/\s+/g, ' ').trim();
const titleFromMessage = (body: string) => cleanMessageForTask(body).split(' ').slice(0, 9).join(' ') || 'New task';
const tomorrowIsoDate = () => {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return date.toISOString().slice(0, 10);
};
const detectDueDate = (body: string) => {
	const lower = body.toLowerCase();
	if (/\btomorrow\b|\bdemain\b/.test(lower)) return tomorrowIsoDate();
	const match = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
	return match?.[1] ?? null;
};
const linkedReferencesForBody = (body: string, tasks: TaskCard[], projects: ProjectSummary[]) => {
	const refs = extractReferenceIds(body, tasks, projects);
	return {
		tasks: tasks.filter((task) => refs.taskIds.includes(task.id)),
		projects: projects.filter((project) => refs.projectIds.includes(project.id)),
	};
};

type ChatDrawerMode = 'references' | 'decisions' | 'media';
type ChatSearchFilters = {
	has_files?: boolean;
	has_images?: boolean;
	decisions?: boolean;
	sender_id?: number;
	date_from?: string;
	date_to?: string;
};

const threadTitle = (
	thread: ChatThread,
	currentUserId?: number,
	publicLabel = 'Studio public',
	privateLabel = 'Private chat',
	projectRoomLabel = 'Project room',
	taskRoomLabel = 'Task room',
) => {
	if (thread.kind === 'public') return publicLabel;
	if (thread.kind === 'project') return thread.project?.name ?? (thread.title || projectRoomLabel);
	if (thread.kind === 'task') return thread.task?.title ?? (thread.title || taskRoomLabel);
	const other = thread.participants.find((user) => user.id !== currentUserId);
	return other ? userLabel(other) : thread.title || privateLabel;
};

const threadPreview = (thread: ChatThread, currentUserId: number, labels: {
	deleted: string;
	photo: string;
	attachment: string;
	noMessage: string;
	you: string;
}, tasks: TaskCard[] = [], projects: ProjectSummary[] = []) => {
	const message = thread.last_message;
	if (!message) return { text: labels.noMessage, kind: 'text' as const };
	const prefix = message.sender.id === currentUserId ? `${labels.you}: ` : '';
	if (message.is_deleted) return { text: `${prefix}${labels.deleted}`, kind: 'text' as const };
	const firstAttachment = message.attachments[0];
	if (firstAttachment) {
		const isImage = isImageAttachment(firstAttachment.mime_type, firstAttachment.name, firstAttachment.file_url ?? firstAttachment.file);
		return {
			text: `${prefix}${isImage ? labels.photo : labels.attachment}`,
			kind: isImage ? 'photo' as const : 'attachment' as const,
		};
	}
	const readableBody = readableReferenceText(message.body, tasks, projects);
	return { text: `${prefix}${readableBody || labels.noMessage}`, kind: 'text' as const };
};

const formatDayLabel = (value: string, todayLabel: string, yesterdayLabel: string, locale: string) => {
	const date = new Date(value);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	if (date.toDateString() === today.toDateString()) return todayLabel;
	if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;
	return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
};

const VoiceMessagePlayer = ({ src, label, seed, compact = false }: { src: string; label: string; seed: string; compact?: boolean }) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const bars = useMemo(() => {
		const base = Array.from(seed || src).reduce((total, char) => total + char.charCodeAt(0), 0);
		return Array.from({ length: 34 }, (_, index) => 8 + ((base + index * 13 + (index % 5) * 7) % 22));
	}, [seed, src]);
	const progress = duration ? currentTime / duration : 0;
	const activeBars = Math.round(progress * bars.length);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const syncTime = () => setCurrentTime(audio.currentTime);
		const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
		const start = () => setPlaying(true);
		const stop = () => {
			setPlaying(false);
			if (audio.ended) setCurrentTime(0);
		};
		audio.addEventListener('timeupdate', syncTime);
		audio.addEventListener('loadedmetadata', syncDuration);
		audio.addEventListener('durationchange', syncDuration);
		audio.addEventListener('ended', stop);
		audio.addEventListener('pause', stop);
		audio.addEventListener('play', start);
		return () => {
			audio.removeEventListener('timeupdate', syncTime);
			audio.removeEventListener('loadedmetadata', syncDuration);
			audio.removeEventListener('durationchange', syncDuration);
			audio.removeEventListener('ended', stop);
			audio.removeEventListener('pause', stop);
			audio.removeEventListener('play', start);
		};
	}, [src]);

	const togglePlayback = async () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
			return;
		}
		setPlaying(true);
		await audio.play().catch(() => setPlaying(false));
	};

	const seek = (value: string) => {
		const audio = audioRef.current;
		if (!audio) return;
		const nextTime = Number(value);
		audio.currentTime = nextTime;
		setCurrentTime(nextTime);
	};

	return (
		<div className="workflow-chat-voice-player" data-playing={playing} data-compact={compact}>
			<button type="button" onClick={togglePlayback} aria-label={label}>
				{playing ? <Pause size={18} /> : <Play size={18} />}
			</button>
			<div className="workflow-chat-voice-track">
				<div className="workflow-chat-voice-waveform" aria-hidden="true">
					{bars.map((height, index) => (
						<span
							key={`${seed}-${index}`}
							data-active={index < activeBars}
							style={{ height }}
						/>
					))}
				</div>
				<input
					type="range"
					min={0}
					max={duration || 0}
					step="0.1"
					value={duration ? currentTime : 0}
					onChange={(event) => seek(event.target.value)}
					aria-label={label}
				/>
				<small>{formatAudioDuration(playing ? currentTime : duration || currentTime)}</small>
			</div>
			<audio ref={audioRef} preload="metadata" src={src} />
		</div>
	);
};

const renderLinkedMessageBody = (
	body: string,
	users: WorkflowUser[],
	tasks: TaskCard[],
	projects: ProjectSummary[],
) => {
	const taskByToken = new Map(tasks.flatMap((task) => [
		[`#T${task.id}`.toLowerCase(), task] as const,
		[referenceTokenFor(task.title).toLowerCase(), task] as const,
	]));
	const projectByToken = new Map(projects.flatMap((project) => [
		[`#P${project.id}`.toLowerCase(), project] as const,
		[referenceTokenFor(project.name).toLowerCase(), project] as const,
	]));
	const userByToken = new Map(users.map((user) => [`@${mentionTokenFor(user)}`, user]));
	const parts = body.split(/(@[\w.-]+|#(?:T\d+|P\d+|[\w-]+))/gi);

	return parts.map((part, index) => {
		if (!part) return null;
		const key = `${part}-${index}`;
		const lower = part.toLowerCase();
		const user = userByToken.get(lower);
		if (user) {
			return (
				<span key={key} className="workflow-chat-inline-tag workflow-chat-inline-tag-user">
					@{userLabel(user)}
				</span>
			);
		}
		const task = taskByToken.get(lower);
		if (task) {
			return (
				<Link key={key} href={DASHBOARD_TASK_VIEW(task.id)} className="workflow-chat-inline-tag workflow-chat-inline-tag-task" data-testid={`workflow-chat-task-link-${task.id}`}>
					#{task.title}
				</Link>
			);
		}
		const project = projectByToken.get(lower);
		if (project) {
			return (
				<Link key={key} href={DASHBOARD_PROJECT_VIEW(project.id)} className="workflow-chat-inline-tag workflow-chat-inline-tag-project">
					#{project.name}
				</Link>
			);
		}
		return part;
	});
};

const dedupeMessages = (messages: ChatMessage[]) => {
	const seen = new Set<number>();
	return messages.filter((message) => {
		if (seen.has(message.id)) return false;
		seen.add(message.id);
		return true;
	});
};

const DesignWorkflowChat = () => {
	const { t, language } = useLanguage();
	const searchParams = useSearchParams();
	const requestedThreadId = Number(searchParams.get('thread') ?? 0) || null;
	const requestedMessageId = Number(searchParams.get('message') ?? 0) || null;
	const requestedMessageKey = requestedThreadId && requestedMessageId ? `${requestedThreadId}:${requestedMessageId}` : '';
	const locale = language === 'en' ? 'en-US' : 'fr-FR';
	const statusLabelFor = (value?: string | null) => value ? (t.workflow.statuses[value] ?? value) : '';
	const profile = useAppSelector(getProfilState);
	const token = useAppSelector(getAccessToken);
	const chatDataReady = Boolean(token && (typeof profile.id === 'number' || profile.email));
	const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
	const [optimisticSelectedThread, setOptimisticSelectedThread] = useState<ChatThread | null>(null);
	const [body, setBody] = useState('');
	const [files, setFiles] = useState<File[]>([]);
	const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
	const [socketConnected, setSocketConnected] = useState(false);
	const [referencesOpen, setReferencesOpen] = useState(false);
	const [drawerMode, setDrawerMode] = useState<ChatDrawerMode>('references');
	const [chatToolsOpen, setChatToolsOpen] = useState(false);
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
	const [reminderDraft, setReminderDraft] = useState({ taskId: '', remindAt: '', note: '' });
	const [typingUsers, setTypingUsers] = useState<Record<number, WorkflowUser>>({});
	const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
	const [recording, setRecording] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [taskModalOpen, setTaskModalOpen] = useState(false);
	const [taskSourceMessage, setTaskSourceMessage] = useState<ChatMessage | null>(null);
	const [taskDraft, setTaskDraft] = useState({ title: '', description: '', projectId: '' });
	const [selectedComposerText, setSelectedComposerText] = useState('');
	const [deleteTargetMessage, setDeleteTargetMessage] = useState<ChatMessage | null>(null);
	const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
	const [referenceActiveIndex, setReferenceActiveIndex] = useState(0);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const markedReadIdsRef = useRef<Set<number>>(new Set());
	const wsRef = useRef<WebSocket | null>(null);
	const typingTimeoutRef = useRef<number | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<BlobPart[]>([]);
	const discardRecordingRef = useRef(false);
	const autoStartedProjectThreadRef = useRef(false);
	const highlightedMessageKeyRef = useRef<string | null>(null);

	const { data: threads = [], isLoading: threadsLoading, isFetching: threadsFetching, refetch: refetchThreads } = useGetChatThreadsQuery(undefined, { skip: !chatDataReady });
	const chatThreads = useMemo(() => threads.filter((thread) => thread.kind !== 'task'), [threads]);
	const requestedThreadAvailable = useMemo(
		() => Boolean(requestedThreadId && chatThreads.some((thread) => thread.id === requestedThreadId)),
		[chatThreads, requestedThreadId],
	);
	const preferredThread = useMemo(
		() =>
			chatThreads.find((thread) => thread.kind === 'public') ??
			chatThreads.find((thread) => thread.unread_count > 0) ??
			chatThreads.find((thread) => thread.last_message) ??
			chatThreads[0],
		[chatThreads],
	);
	const selectedThread = useMemo(
		() =>
			chatThreads.find((thread) => thread.id === selectedThreadId) ??
			(optimisticSelectedThread?.id === selectedThreadId ? optimisticSelectedThread : undefined) ??
			preferredThread,
		[chatThreads, optimisticSelectedThread, preferredThread, selectedThreadId],
	);
	const chatInitialLoading = chatDataReady && chatThreads.length === 0 && (threadsLoading || threadsFetching);
	const threadPreviewLabels = useMemo(() => ({
		deleted: t.workflow.labels.messageDeleted ?? 'Message deleted',
		photo: t.workflow.labels.photoMessage ?? 'Photo',
		attachment: t.workflow.labels.attachmentMessage ?? 'Attachment',
		noMessage: t.workflow.labels.noMessageYet ?? 'No message yet',
		you: t.workflow.labels.you ?? 'You',
	}), [t]);
	const privateThreadByUserId = useMemo(() => {
		const byUserId = new Map<number, ChatThread>();
		chatThreads
			.filter((thread) => thread.kind === 'private')
			.forEach((thread) => {
				const peer = thread.participants.find((user) => user.id !== profile.id);
				if (peer) byUserId.set(peer.id, thread);
			});
		return byUserId;
	}, [chatThreads, profile.id]);
	const publicThreads = useMemo(() => chatThreads.filter((thread) => thread.kind === 'public'), [chatThreads]);
	const projectThreadByProjectId = useMemo(() => {
		const byProjectId = new Map<number, ChatThread>();
		chatThreads
			.filter((thread) => thread.kind === 'project' && thread.project)
			.forEach((thread) => {
				if (thread.project) byProjectId.set(thread.project.id, thread);
			});
		return byProjectId;
	}, [chatThreads]);
	const { data: currentMessages = [], refetch: refetchMessages } = useGetChatMessagesQuery(
		{ threadId: selectedThread?.id ?? 0, limit: PAGE_SIZE, q: searchTerm || undefined, ...searchFilters },
		{ skip: !chatDataReady || !selectedThread?.id },
	);
	const [loadOlderMessages] = useLazyGetChatMessagesQuery();
	const [createThread] = useCreateChatThreadMutation();
	const [sendMessage, sendMessageState] = useSendChatMessageMutation();
	const [createTask, createTaskState] = useCreateTaskMutation();
	const [markRead] = useMarkChatMessageReadMutation();
	const [deleteChatMessage] = useDeleteChatMessageMutation();
	const [editChatMessage] = useEditChatMessageMutation();
	const [reactChatMessage] = useReactChatMessageMutation();
	const [markChatDecision] = useMarkChatDecisionMutation();
	const [addChatReminder] = useAddChatReminderMutation();
	const { data: projects = [] } = useGetProjectsQuery(undefined, { skip: !chatDataReady });
	const { data: activeTasks = [] } = useGetTasksQuery({ archived: false }, { skip: !chatDataReady });
	const { data: archivedTasks = [] } = useGetTasksQuery({ archived: true }, { skip: !chatDataReady });
	const tasks = useMemo(() => {
		const byId = new Map<number, TaskCard>();
		[...activeTasks, ...archivedTasks].forEach((task) => byId.set(task.id, task));
		return Array.from(byId.values());
	}, [activeTasks, archivedTasks]);

	useEffect(() => {
		if (requestedThreadId && (threadsLoading || threadsFetching || requestedThreadAvailable)) return;
		if (selectedThread || selectedThreadId || chatInitialLoading || projects.length === 0 || autoStartedProjectThreadRef.current) return;
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
	}, [chatInitialLoading, createThread, projects, requestedThreadAvailable, requestedThreadId, selectedThread, selectedThreadId, threadsFetching, threadsLoading]);

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

	const usersResponse = useGetUsersListQuery({ with_pagination: false }, { skip: !chatDataReady });
	const usersRaw = (usersResponse.data ?? []) as Array<Partial<UserClass>> | { results?: Array<Partial<UserClass>>; data?: Array<Partial<UserClass>> };
	const users = (Array.isArray(usersRaw) ? usersRaw : usersRaw.results ?? usersRaw.data ?? [])
		.filter((user): user is WorkflowUser => typeof user.id === 'number' && Boolean(user.email) && user.id !== profile.id)
		.map((user) => {
			const croppedAvatar = 'avatar_cropped' in user && typeof user.avatar_cropped === 'string' ? user.avatar_cropped : null;
			return {
				id: user.id,
				first_name: user.first_name ?? '',
				last_name: user.last_name ?? '',
				email: user.email ?? '',
				role: user.role ?? 'designer',
				avatar: typeof user.avatar === 'string' ? user.avatar : croppedAvatar,
			};
		});
	const currentWorkflowUser: WorkflowUser = useMemo(() => ({
		id: profile.id,
		first_name: profile.first_name ?? '',
		last_name: profile.last_name ?? '',
		email: profile.email ?? '',
		role: profile.role ?? 'designer',
		avatar: typeof profile.avatar === 'string' ? profile.avatar : null,
	}), [profile.avatar, profile.email, profile.first_name, profile.id, profile.last_name, profile.role]);

	useEffect(() => {
		const pendingRequestedThread = requestedThreadId && (threadsLoading || threadsFetching || requestedThreadAvailable);
		if (!selectedThreadId && !pendingRequestedThread && preferredThread) {
			setSelectedThreadId(preferredThread.id);
		}
	}, [preferredThread, requestedThreadAvailable, requestedThreadId, selectedThreadId, threadsFetching, threadsLoading]);

	useEffect(() => {
		setOlderMessages([]);
		setHasOlder(false);
		setTypingUsers({});
		markedReadIdsRef.current.clear();
	}, [selectedThread?.id, searchTerm, searchFilters]);

	useEffect(() => {
		setHasOlder(currentMessages.length >= PAGE_SIZE);
	}, [currentMessages]);

	const latestCurrentMessageId = currentMessages[currentMessages.length - 1]?.id ?? 0;

	useEffect(() => {
		if (!selectedThread?.id || searchTerm || olderMessages.length) return;
		const scrollToBottom = () => {
			if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		};
		requestAnimationFrame(scrollToBottom);
		const timeout = window.setTimeout(scrollToBottom, 80);
		return () => window.clearTimeout(timeout);
	}, [currentMessages.length, latestCurrentMessageId, olderMessages.length, searchTerm, selectedThread?.id]);

	useEffect(() => () => filePreviewUrls.forEach((url) => URL.revokeObjectURL(url)), [filePreviewUrls]);

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

	useEffect(() => {
		if (!WS_URL || !token) return;
		const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
		wsRef.current = ws;
		ws.onopen = () => setSocketConnected(true);
		ws.onclose = () => {
			setSocketConnected(false);
			if (wsRef.current === ws) wsRef.current = null;
		};
		ws.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data);
				const signalType = payload.type ?? payload.message?.type;
				if (payload.message?.type === 'USER_PRESENCE') {
					setOnlineUserIds(payload.message.online_user_ids ?? []);
					return;
				}
				if ((signalType === 'chat.typing' || signalType === 'chat_typing') && payload.thread_id === selectedThread?.id && payload.user?.id !== profile.id) {
					if (payload.is_typing) {
						setTypingUsers((current) => ({ ...current, [payload.user.id]: payload.user }));
						window.setTimeout(() => {
							setTypingUsers((current) => {
								const next = { ...current };
								delete next[payload.user.id];
								return next;
							});
						}, 2400);
					} else {
						setTypingUsers((current) => {
							const next = { ...current };
							delete next[payload.user.id];
							return next;
						});
					}
					return;
				}
				if (['chat.message', 'chat.read', 'chat.deleted', 'chat.updated', 'chat.reaction', 'chat.decision', 'chat.reminder', 'chat_message', 'chat_read', 'chat_deleted', 'chat_updated', 'chat_reaction', 'chat_decision', 'chat_reminder'].includes(signalType)) {
					refetchThreads();
					refetchMessages();
				}
			} catch {
				refetchThreads();
			}
		};
		return () => {
			if (wsRef.current === ws) wsRef.current = null;
			ws.close();
		};
	}, [profile.id, refetchMessages, refetchThreads, selectedThread?.id, token]);

	const messageList = useMemo(
		() => dedupeMessages([...olderMessages, ...currentMessages]),
		[olderMessages, currentMessages],
	);
	const threadPreviewFor = useCallback((thread: ChatThread) => {
		const latestSelectedMessage = selectedThread?.id === thread.id ? (messageList[messageList.length - 1] ?? null) : null;
		return threadPreview(
			thread.last_message ? thread : { ...thread, last_message: latestSelectedMessage },
			profile.id,
			threadPreviewLabels,
			tasks,
			projects,
		);
	}, [messageList, profile.id, projects, selectedThread?.id, tasks, threadPreviewLabels]);
	const messageMentionUsers = useMemo(
		() => {
			const byId = new Map<number, WorkflowUser>();
			[currentWorkflowUser, ...users].forEach((user) => byId.set(user.id, user));
			messageList.forEach((message) => {
				byId.set(message.sender.id, message.sender);
				message.mentions.forEach((user) => byId.set(user.id, user));
			});
			return Array.from(byId.values());
		},
		[currentWorkflowUser, messageList, users],
	);
	const linkedReferences = useMemo(() => {
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
	}, [messageList, projects, tasks]);
	const linkedReferenceCount = linkedReferences.tasks.length + linkedReferences.projects.length;
	const firstUnreadMessageId = useMemo(
		() => messageList.find((message) => message.sender.id !== profile.id && !message.read_by.some((user) => user.id === profile.id))?.id ?? null,
		[messageList, profile.id],
	);
	const decisionMessages = useMemo(
		() => messageList.filter((message) => Boolean(message.decision_at) && !message.is_deleted),
		[messageList],
	);
	const mediaAttachments = useMemo(
		() => messageList.flatMap((message) => message.attachments.map((attachment) => ({ message, attachment }))),
		[messageList],
	);
	const previewTask = previewTarget?.kind === 'task' ? tasks.find((task) => task.id === previewTarget.id) : undefined;
	const previewProject = previewTarget?.kind === 'project' ? projects.find((project) => project.id === previewTarget.id) : undefined;
	const typingNames = Object.values(typingUsers).map(userLabel).join(', ');
	const activeChatFilterCount = [
		searchTerm.trim(),
		searchFilters.sender_id,
		searchFilters.date_from,
		searchFilters.has_files,
		searchFilters.has_images,
		searchFilters.decisions,
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

	useEffect(() => {
		const scroller = scrollRef.current;
		if (!scroller || !selectedThread?.id || !hasOlder || loadingOlder || searchTerm) return;
		const onScroll = async () => {
			if (!scrollRef.current || scrollRef.current.scrollTop > 40 || loadingOlder) return;
			const oldest = messageList[0];
			if (!oldest) return;
			setLoadingOlder(true);
			try {
				const previousHeight = scrollRef.current.scrollHeight;
				const older = await loadOlderMessages({
					threadId: selectedThread.id,
					before_id: oldest.id,
					limit: PAGE_SIZE,
				}).unwrap();
				setOlderMessages((current) => dedupeMessages([...older, ...current]));
				setHasOlder(older.length >= PAGE_SIZE);
				requestAnimationFrame(() => {
					if (scrollRef.current) {
						scrollRef.current.scrollTop = scrollRef.current.scrollHeight - previousHeight;
					}
				});
			} finally {
				setLoadingOlder(false);
			}
		};
		scroller.addEventListener('scroll', onScroll);
		return () => scroller.removeEventListener('scroll', onScroll);
	}, [hasOlder, loadOlderMessages, loadingOlder, messageList, searchTerm, selectedThread?.id]);

	const composerTrigger = body.match(/(^|\s)([@#])([\w:.-]*)$/);
	const mentionMatch = composerTrigger?.[2] === '@' ? composerTrigger : null;
	const referenceMatch = composerTrigger?.[2] === '#' ? composerTrigger : null;
	const mentionOptions = useMemo(() => {
		if (!mentionMatch) return [];
		const query = mentionMatch[3].toLowerCase();
		return users
			.filter((user) => {
				const localPart = user.email.split('@', 1)[0].toLowerCase();
				return !query || user.first_name.toLowerCase().includes(query) || user.last_name.toLowerCase().includes(query) || localPart.includes(query);
			})
			.slice(0, 6);
	}, [mentionMatch, users]);
	const referenceOptions = useMemo(() => {
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
	}, [activeTasks, projects, referenceMatch]);
	const mentionTriggerText = mentionMatch?.[0] ?? '';
	const referenceTriggerText = referenceMatch?.[0] ?? '';

	useEffect(() => {
		setMentionActiveIndex(0);
	}, [mentionTriggerText, mentionOptions.length]);

	useEffect(() => {
		setReferenceActiveIndex(0);
	}, [referenceTriggerText, referenceOptions.length]);

	const groupedMessages = useMemo(() => {
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
	}, [messageList]);

	const resetFiles = () => {
		filePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
		setFilePreviewUrls([]);
		setFiles([]);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const submit = async () => {
		if (!selectedThread?.id || (!body.trim() && files.length === 0)) return;
		const data = new FormData();
		data.append('body', body.trim());
		if (replyTarget) data.append('reply_to_id', String(replyTarget.id));
		files.forEach((file) => data.append('files', file));
		await sendMessage({ threadId: selectedThread.id, data }).unwrap();
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
		if (!selectedThread?.id || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
		wsRef.current.send(JSON.stringify({ type: 'chat.typing', thread_id: selectedThread.id, is_typing: isTyping }));
		if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
		if (isTyping) {
			typingTimeoutRef.current = window.setTimeout(() => emitTyping(false), 1400);
		}
	};

	const submitEdit = async () => {
		if (!editingMessage || !editText.trim()) return;
		await editChatMessage({ id: editingMessage.id, body: editText.trim() }).unwrap();
		setEditingMessage(null);
		setEditText('');
	};

	const forwardToThread = async (thread: ChatThread) => {
		if (!forwardMessage) return;
		const readableBody = readableReferenceText(forwardMessage.body, tasks, projects) || forwardMessage.attachments[0]?.name || '';
		const data = new FormData();
		data.append('body', readableBody);
		await sendMessage({ threadId: thread.id, data }).unwrap();
		setForwardMessage(null);
	};

	const scrollToMessage = useCallback((id: number) => {
		const element = document.getElementById(`chat-message-${id}`);
		if (!element) return;
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		element.classList.add('is-highlighted');
		window.setTimeout(() => element.classList.remove('is-highlighted'), 1500);
	}, []);

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
	}, [messageList, requestedMessageId, requestedMessageKey, requestedThreadId, scrollToMessage, selectedThread?.id]);

	const openReminder = (message: ChatMessage) => {
		const refs = linkedReferencesForBody(message.body, tasks, projects);
		const task = refs.tasks[0];
		setReminderMessage(message);
		setReminderDraft({
			taskId: task ? String(task.id) : '',
			remindAt: task?.due_date ? `${task.due_date}T09:00` : '',
			note: cleanMessageForTask(message.body).slice(0, 120),
		});
	};

	const submitReminder = async () => {
		if (!reminderMessage) return;
		await addChatReminder({
			id: reminderMessage.id,
			task_id: reminderDraft.taskId ? Number(reminderDraft.taskId) : null,
			remind_at: reminderDraft.remindAt ? new Date(reminderDraft.remindAt).toISOString() : null,
			note: reminderDraft.note,
		}).unwrap();
		setReminderMessage(null);
		setReminderDraft({ taskId: '', remindAt: '', note: '' });
	};

	const stopVoiceRecording = (discard = false) => {
		discardRecordingRef.current = discard;
		mediaRecorderRef.current?.stop();
		setRecording(false);
	};

	const toggleVoiceRecording = async () => {
		if (recording) {
			stopVoiceRecording(false);
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia) return;
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		recordedChunksRef.current = [];
		discardRecordingRef.current = false;
		const recorder = new MediaRecorder(stream);
		mediaRecorderRef.current = recorder;
		recorder.ondataavailable = (event) => {
			if (event.data.size) recordedChunksRef.current.push(event.data);
		};
		recorder.onstop = () => {
			stream.getTracks().forEach((track) => track.stop());
			mediaRecorderRef.current = null;
			if (discardRecordingRef.current) {
				recordedChunksRef.current = [];
				discardRecordingRef.current = false;
				return;
			}
			const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
			const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
			setFiles((current) => [...current, file]);
			setFilePreviewUrls((current) => [...current, URL.createObjectURL(file)]);
		};
		recorder.start();
		setRecording(true);
	};

	const confirmDeleteMessage = async () => {
		if (!deleteTargetMessage) return;
		await deleteChatMessage(deleteTargetMessage.id).unwrap();
		setDeleteTargetMessage(null);
	};

	const openCreateTaskFromMessage = (message: ChatMessage) => {
		const refs = extractReferenceIds(message.body, tasks, projects);
		const referencedTask = tasks.find((task) => refs.taskIds.includes(task.id));
		const referencedProject =
			projects.find((project) => refs.projectIds.includes(project.id)) ??
			(referencedTask ? projects.find((project) => project.id === referencedTask.project.id) : undefined) ??
			projects[0];
		setTaskSourceMessage(message);
		setTaskDraft({
			title: titleFromMessage(message.body),
			description: message.body,
			projectId: referencedProject ? String(referencedProject.id) : '',
		});
		setTaskModalOpen(true);
	};

	const openCreateTaskFromSelection = () => {
		const selectedText = selectedComposerText.trim();
		if (!selectedText) return;
		setTaskSourceMessage(null);
		setTaskDraft({
			title: selectedText.split(/\s+/).slice(0, 9).join(' '),
			description: selectedText,
			projectId: projects[0] ? String(projects[0].id) : '',
		});
		setTaskModalOpen(true);
	};

	const submitTaskFromMessage = async () => {
		const projectId = Number(taskDraft.projectId);
		if (!projectId || !taskDraft.title.trim()) return;
		const createdTask = await createTask({
			project_id: projectId,
			title: taskDraft.title.trim(),
			description: taskDraft.description.trim(),
			current_assignee_id: typeof profile.id === 'number' ? profile.id : null,
			status: 'backlog',
			priority: 'medium',
			due_date: detectDueDate(taskDraft.description),
			estimated_minutes: 540,
			source_chat_message_id: taskSourceMessage?.id ?? null,
		}).unwrap();
		setTaskModalOpen(false);
		setTaskSourceMessage(null);
		setBody((current) => `${current.trim()} ${referenceTokenFor(createdTask.title)} `.trimStart());
		setSelectedComposerText('');
	};

	const removeSelectedFile = (index: number) => {
		setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
		setFilePreviewUrls((current) => {
			const next = [...current];
			const [removed] = next.splice(index, 1);
			if (removed) URL.revokeObjectURL(removed);
			return next;
		});
	};

	return (
		<div className="workflow-chat-shell">
			<div className="workflow-chat-content">
				<aside className="workflow-chat-sidebar">
				<WorkflowPageHero
					element="div"
					className="workflow-chat-sidebar-head"
					eyebrow={t.workflow.labels.workflow}
					title={t.workflow.labels.chatTitle ?? 'Chat'}
					titleElement="h2"
					actionsWrapper={false}
					actions={
						<span data-live={socketConnected}>
							{socketConnected ? (t.workflow.labels.socketLive ?? 'Live') : (t.workflow.labels.socketOffline ?? 'Offline')}
						</span>
					}
				/>
				<div className="workflow-chat-thread-section">
					<WorkflowPanelPill baseClassName="workflow-chat-panel-pill" label={t.workflow.labels.chatTitle ?? 'Studio chat'} value={publicThreads.length} labelElement="span" />
					{publicThreads.map((thread) => {
						const peer = thread.participants.find((user) => user.id !== profile.id) ?? thread.participants[0];
						const preview = threadPreviewFor(thread);
						return (
							<button
								key={thread.id}
								type="button"
								onClick={() => setSelectedThreadId(thread.id)}
								className={[
									'workflow-chat-thread-button',
									selectedThread?.id === thread.id ? 'is-active' : '',
									thread.unread_count ? 'is-unread' : '',
								].join(' ')}
							>
								{peer ? (
									<WorkflowAvatar
										user={peer}
										size={30}
										online={onlineUserIds.includes(peer.id)}
										showPresence
										avatarClassName="workflow-chat-avatar"
										presenceClassName="workflow-chat-presence-wrap"
										presenceDotClassName="workflow-chat-presence-badge"
									/>
								) : <Users size={16} />}
								<span>
									<b>
										{threadTitle(
											thread,
											profile.id,
											t.workflow.labels.publicStudio ?? 'Studio public',
											t.workflow.labels.privateChat ?? 'Private chat',
											t.workflow.labels.projectRoom ?? 'Project room',
											t.workflow.labels.taskRoom ?? 'Task room',
										)}
									</b>
									<small className="workflow-chat-thread-preview">
										{preview.kind === 'photo' ? <ImageIcon size={13} /> : null}
										{preview.kind === 'attachment' ? <Paperclip size={13} /> : null}
										<span>{preview.text}</span>
									</small>
								</span>
								{thread.unread_count ? (
									<i>
										{thread.unread_count}
									</i>
								) : null}
							</button>
						);
					})}
				</div>
				<div className="workflow-chat-context-section">
					<WorkflowPanelPill baseClassName="workflow-chat-panel-pill" className="workflow-chat-panel-pill-amber" label={t.workflow.labels.projects ?? 'Projects'} value={projects.length} labelElement="span" />
					<div className="workflow-chat-context-list">
						{projects.map((project) => {
							const thread = projectThreadByProjectId.get(project.id);
							const preview = thread ? threadPreviewFor(thread) : null;
							return (
								<button
									key={project.id}
									type="button"
									onClick={() => void startProjectThread(project)}
									className={['workflow-chat-context-button', thread?.unread_count ? 'is-unread' : '', selectedThread?.id === thread?.id ? 'is-active' : ''].join(' ')}
								>
									<span className="workflow-chat-context-icon"><BriefcaseBusiness size={15} /></span>
									<span className="workflow-chat-direct-copy">
										<b>{project.name}</b>
										<small className="workflow-chat-thread-preview">
											{preview?.kind === 'photo' ? <ImageIcon size={13} /> : null}
											{preview?.kind === 'attachment' ? <Paperclip size={13} /> : null}
											<span>{preview?.text ?? (t.workflow.labels.noMessageYet ?? 'No message yet')}</span>
										</small>
									</span>
									{thread?.unread_count ? <i>{thread.unread_count}</i> : null}
								</button>
							);
						})}
					</div>
				</div>
				<div className="workflow-chat-direct-section">
					<WorkflowPanelPill baseClassName="workflow-chat-panel-pill" className="workflow-chat-panel-pill-green" label={t.workflow.labels.privateConversations ?? 'Private'} value={users.length} labelElement="span" />
					<div className="workflow-chat-direct-list">
						{users.map((user) => {
							const thread = privateThreadByUserId.get(user.id);
							const preview = thread ? threadPreviewFor(thread) : null;
							return (
								<button
									key={user.id}
									type="button"
									onClick={async () => {
										const nextThread = thread ?? (await createThread({ kind: 'private', recipient_id: user.id }).unwrap());
										if (!thread) setOptimisticSelectedThread(nextThread);
										setSelectedThreadId(nextThread.id);
									}}
									className={['workflow-chat-direct-button', thread?.unread_count ? 'is-unread' : '', selectedThread?.id === thread?.id ? 'is-active' : ''].join(' ')}
								>
									<WorkflowAvatar
										user={user}
										size={30}
										online={onlineUserIds.includes(user.id)}
										showPresence
										avatarClassName="workflow-chat-avatar"
										presenceClassName="workflow-chat-presence-wrap"
										presenceDotClassName="workflow-chat-presence-badge"
									/>
									<span className="workflow-chat-direct-copy">
										<b>{userLabel(user)}</b>
										<small className="workflow-chat-thread-preview">
											{preview?.kind === 'photo' ? <ImageIcon size={13} /> : null}
											{preview?.kind === 'attachment' ? <Paperclip size={13} /> : null}
											<span>{preview?.text ?? (t.workflow.labels.noMessageYet ?? 'No message yet')}</span>
										</small>
									</span>
									{thread?.unread_count ? <i>{thread.unread_count}</i> : null}
								</button>
							);
						})}
					</div>
				</div>
				</aside>

				<section className="workflow-chat-room">
				<div className="workflow-chat-room-header">
					<div className="workflow-chat-room-title">
						<div>
							<p>
								{selectedThread
									? threadTitle(
											selectedThread,
											profile.id,
											t.workflow.labels.publicStudio ?? 'Studio public',
											t.workflow.labels.privateChat ?? 'Private chat',
											t.workflow.labels.projectRoom ?? 'Project room',
											t.workflow.labels.taskRoom ?? 'Task room',
										)
									: (t.workflow.labels.chatTitle ?? 'Chat')}
								</p>
						</div>
						<div className="workflow-chat-room-title-actions">
							<em>{messageList.length} {t.workflow.labels.messagesLabel ?? 'messages'}</em>
							<button
								type="button"
								className={['workflow-chat-tools-toggle', chatToolsOpen ? 'is-open' : ''].join(' ')}
								onClick={() => setChatToolsOpen((current) => !current)}
								aria-expanded={chatToolsOpen}
								aria-label={t.common.filterBy ?? t.workflow.labels.searchMessages ?? 'Filters'}
							>
								<SlidersHorizontal size={16} />
								<span>{t.common.filterBy ?? 'Filtres'}</span>
								{activeChatFilterCount ? <b>{activeChatFilterCount}</b> : null}
							</button>
						</div>
					</div>
					{chatToolsOpen ? <div className="workflow-chat-room-tools">
						<label className="workflow-chat-search">
							<Search size={15} />
							<input
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder={t.workflow.labels.searchMessages ?? t.workflow.labels.search}
								className="min-w-0 flex-1 bg-transparent outline-none"
							/>
						</label>
						<div className="workflow-chat-filter-row">
							<select
								value={searchFilters.sender_id ?? ''}
								onChange={(event) => setSearchFilters((current) => ({ ...current, sender_id: event.target.value ? Number(event.target.value) : undefined }))}
								className="workflow-chat-filter-select"
								aria-label={t.workflow.labels.sender ?? 'Sender'}
							>
								<option key="sender-all" value="">{t.workflow.labels.sender ?? 'Sender'}</option>
								{messageMentionUsers.map((user, index) => (
									<option key={`sender-${user.id}-${index}`} value={user.id}>{userLabel(user)}</option>
								))}
							</select>
							<div className="workflow-chat-date-field workflow-chat-filter-date">
								<CalendarDays size={16} />
								<input
									type="date"
									value={searchFilters.date_from ?? ''}
									onChange={(event) => setSearchFilters((current) => ({ ...current, date_from: event.target.value || undefined }))}
									aria-label={t.workflow.labels.dateFrom ?? 'From'}
								/>
								{searchFilters.date_from ? (
									<button
										type="button"
										onClick={() => setSearchFilters((current) => ({ ...current, date_from: undefined }))}
										aria-label={t.common.clearSelection}
									>
										<X size={14} />
									</button>
								) : null}
							</div>
							<button
								type="button"
								className={['workflow-chat-mini-toggle', searchFilters.has_files ? 'is-active' : ''].join(' ')}
								onClick={() => setSearchFilters((current) => ({ ...current, has_files: !current.has_files || undefined }))}
								aria-label={t.workflow.labels.attachments ?? 'Attachments'}
							>
								<Paperclip size={15} />
							</button>
							<button
								type="button"
								className={['workflow-chat-mini-toggle', searchFilters.has_images ? 'is-active' : ''].join(' ')}
								onClick={() => setSearchFilters((current) => ({ ...current, has_images: !current.has_images || undefined }))}
								aria-label={t.workflow.labels.images ?? 'Images'}
							>
								<Images size={15} />
							</button>
							<button
								type="button"
								className={['workflow-chat-mini-toggle', searchFilters.decisions ? 'is-active' : ''].join(' ')}
								onClick={() => setSearchFilters((current) => ({ ...current, decisions: !current.decisions || undefined }))}
								aria-label={t.workflow.labels.decisions ?? 'Decisions'}
							>
								<CheckCheck size={15} />
							</button>
							<button
								type="button"
								className="workflow-chat-ref-toggle has-tooltip"
								onClick={() => {
									setDrawerMode('references');
									setReferencesOpen(true);
								}}
								aria-label={t.workflow.labels.linkedReferences ?? 'Linked references'}
							>
								<BriefcaseBusiness size={16} />
								<span>{linkedReferenceCount}</span>
								<i>{t.workflow.labels.linkedReferences ?? 'Linked references'}</i>
							</button>
							<button
								type="button"
								className="workflow-chat-ref-toggle has-tooltip"
								onClick={() => {
									setDrawerMode('decisions');
									setReferencesOpen(true);
								}}
								aria-label={t.workflow.labels.decisions ?? 'Decisions'}
							>
								<CheckCheck size={16} />
								<span>{decisionMessages.length}</span>
								<i>{t.workflow.labels.decisions ?? 'Decisions'}</i>
							</button>
							<button
								type="button"
								className="workflow-chat-ref-toggle has-tooltip"
								onClick={() => {
									setDrawerMode('media');
									setReferencesOpen(true);
								}}
								aria-label={t.workflow.labels.mediaFiles ?? 'Media files'}
							>
								<Images size={16} />
								<span>{mediaAttachments.length}</span>
								<i>{t.workflow.labels.mediaFiles ?? 'Media files'}</i>
							</button>
						</div>
					</div> : null}
				</div>
				<div ref={scrollRef} className="workflow-chat-stream">
					{hasOlder ? (
						<div className="flex justify-center">
							<button
								type="button"
								disabled={loadingOlder}
								onClick={async () => {
									const oldest = messageList[0];
									if (!oldest || !selectedThread?.id) return;
									setLoadingOlder(true);
									try {
										const older = await loadOlderMessages({
											threadId: selectedThread.id,
											before_id: oldest.id,
											limit: PAGE_SIZE,
										}).unwrap();
										setOlderMessages((current) => dedupeMessages([...older, ...current]));
										setHasOlder(older.length >= PAGE_SIZE);
									} finally {
										setLoadingOlder(false);
									}
								}}
								className="workflow-chat-load-older"
							>
								<ArrowDown size={15} />
								<span>{loadingOlder ? (t.common.loading ?? 'Chargement...') : (t.workflow.buttons.loadOlder ?? 'Load older')}</span>
							</button>
						</div>
					) : null}

					{chatInitialLoading ? (
						<div className="workflow-chat-empty-state">
							<span><MessagesSquare size={22} /></span>
							<h3>{t.workflow.labels.loading ?? t.common.loading ?? 'Loading...'}</h3>
							<p>{t.workflow.labels.loadingConversation ?? t.workflow.labels.selectConversationHint ?? 'Loading conversations.'}</p>
						</div>
					) : null}

					{!chatInitialLoading && !selectedThread ? (
						<div className="workflow-chat-empty-state">
							<span><MessagesSquare size={22} /></span>
							<h3>{t.workflow.labels.selectConversation ?? 'Select a conversation'}</h3>
							<p>{t.workflow.labels.selectConversationHint ?? 'Choose a project or direct message.'}</p>
						</div>
					) : null}

					{!chatInitialLoading && selectedThread && messageList.length === 0 ? (
						<div className="workflow-chat-empty-state">
							<span><MessagesSquare size={22} /></span>
							<h3>{t.workflow.labels.emptyConversation ?? t.workflow.labels.noMessageYet ?? 'No message yet'}</h3>
							<p>{t.workflow.labels.emptyConversationHint ?? threadTitle(selectedThread, profile.id, t.workflow.labels.publicStudio ?? 'Public channel', t.workflow.labels.privateChat ?? 'Private chat', t.workflow.labels.projectRoom ?? 'Project room', t.workflow.labels.taskRoom ?? 'Task room')}</p>
						</div>
					) : null}

					{groupedMessages.map((group) => (
						<div key={group.day} className="space-y-3">
							<div className="flex justify-center">
								<span className="workflow-chat-day-chip">
									{formatDayLabel(
										group.items[0].created_at,
										t.workflow.labels.today ?? 'Today',
										t.workflow.labels.yesterday ?? 'Yesterday',
										locale,
									)}
								</span>
							</div>
							{group.items.map((message) => {
								const mine = message.sender.id === profile.id;
								const messageReferences = linkedReferencesForBody(message.body, tasks, projects);
								const senderName = selectedThread?.kind === 'public' ? userLabel(message.sender) : mine ? (t.workflow.labels.you ?? 'You') : userLabel(message.sender);
								const bubbleTone = mine
									? 'border-[color:var(--accent)] bg-(--accent-soft)'
									: OTHER_BUBBLE_COLORS[message.sender.id % OTHER_BUBBLE_COLORS.length];
								return (
									<div key={message.id} id={`chat-message-${message.id}`} data-testid={`workflow-chat-message-${message.id}`} data-message-id={message.id} className="workflow-chat-message-row">
										{firstUnreadMessageId === message.id ? (
											<div className="workflow-chat-unread-separator">
												<span>{t.workflow.labels.unreadMessages ?? 'Unread messages'}</span>
											</div>
										) : null}
										<div className={['flex items-end gap-3', mine ? 'justify-end' : 'justify-start'].join(' ')}>
											{!mine ? (
											<button
												type="button"
												onClick={() => selectedThread?.kind === 'public' && void startPrivateThread(message.sender)}
												className="workflow-chat-avatar-button"
												aria-label={userLabel(message.sender)}
											>
												<WorkflowAvatar user={message.sender} size={34} avatarClassName="workflow-chat-avatar" />
											</button>
										) : null}
										<div className={['workflow-chat-bubble max-w-[82%] rounded-2xl border px-4 py-3 shadow-(--shadow-sm)', mine ? 'workflow-chat-bubble-mine' : '', bubbleTone].join(' ')}>
											<div className="mb-2 flex items-start justify-between gap-3">
												<button
													type="button"
													onClick={() => selectedThread?.kind === 'public' && !mine && void startPrivateThread(message.sender)}
													className="workflow-chat-sender-name"
													disabled={selectedThread?.kind !== 'public' || mine}
												>
													{senderName}
												</button>
												<div className="flex items-center gap-2 text-(--ink-soft)">
													<button
														type="button"
														onClick={() => setReplyTarget(message)}
														className="hover:text-(--ink)"
													aria-label={t.workflow.buttons.reply ?? 'Reply'}
												>
													<Reply size={15} />
												</button>
												{!message.is_deleted ? (
													<span className="workflow-chat-reaction-menu">
														<button
															type="button"
															onClick={() => setReactionPickerMessageId((current) => current === message.id ? null : message.id)}
															className="hover:text-(--ink)"
															aria-label={t.workflow.buttons.react ?? 'React'}
														>
															<SmilePlus size={15} />
														</button>
														{reactionPickerMessageId === message.id ? (
															<span className="workflow-chat-reaction-picker">
																{REACTION_OPTIONS.map(({ emoji, label, Icon }) => {
																	const active = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.user.id === profile.id);
																	return (
																		<button
																			key={emoji}
																			type="button"
																			className={active ? 'is-active' : ''}
																			onClick={() => {
																				reactChatMessage({ id: message.id, emoji });
																				setReactionPickerMessageId(null);
																			}}
																			aria-label={label}
																		>
																			<Icon size={15} />
																		</button>
																	);
																})}
															</span>
														) : null}
													</span>
												) : null}
												{!message.is_deleted ? (
													<button
														type="button"
															onClick={() => markChatDecision({ id: message.id, is_decision: !message.decision_at })}
															className={message.decision_at ? 'text-emerald-700' : 'hover:text-(--ink)'}
															aria-label={t.workflow.buttons.markDecision ?? 'Mark decision'}
														>
															<CheckCheck size={15} />
														</button>
													) : null}
													{!message.is_deleted ? (
														<button
															type="button"
															onClick={() => openReminder(message)}
															className="hover:text-(--ink)"
															aria-label={t.workflow.buttons.addReminder ?? 'Add reminder'}
														>
															<AlarmClock size={15} />
														</button>
													) : null}
													{!message.is_deleted ? (
														<button
															type="button"
															onClick={() => setForwardMessage(message)}
															className="hover:text-(--ink)"
															aria-label={t.workflow.buttons.forwardMessage ?? 'Forward'}
														>
															<Forward size={15} />
														</button>
													) : null}
													{!message.is_deleted ? (
														<button
															type="button"
															onClick={() => openCreateTaskFromMessage(message)}
															className="workflow-chat-create-task-action hover:text-(--accent-strong)"
															aria-label={t.workflow.buttons.createTaskFromMessage ?? 'Create task from message'}
														>
															<CheckSquare2 size={15} />
														</button>
													) : null}
													{mine && !message.is_deleted ? (
														<button
															type="button"
															onClick={() => {
																setEditingMessage(message);
																setEditText(message.body);
															}}
															className="hover:text-(--ink)"
															aria-label={t.workflow.buttons.editMessage ?? 'Edit'}
														>
															<Edit3 size={15} />
														</button>
													) : null}
													{mine && !message.is_deleted ? (
														<button
															type="button"
															onClick={() => setDeleteTargetMessage(message)}
															className="hover:text-red-600"
															aria-label={t.workflow.buttons.deleteMessage ?? 'Delete message'}
														>
															<Trash2 size={15} />
														</button>
													) : null}
												</div>
											</div>
											{message.reply_to ? (
												<button
													type="button"
													onClick={() => scrollToMessage(message.reply_to!.id)}
													className="mb-2 w-full rounded-lg border border-black/8 bg-white/70 px-3 py-2 text-left text-xs text-(--ink-soft)"
												>
													<p className="font-semibold text-(--ink)">{userLabel(message.reply_to.sender)}</p>
													<p className="mt-1 line-clamp-2">{readableReferenceText(message.reply_to.body, tasks, projects)}</p>
												</button>
											) : null}
											{editingMessage?.id === message.id ? (
												<div className="workflow-chat-edit-box">
													<textarea
														value={editText}
														onChange={(event) => setEditText(event.target.value)}
														rows={3}
														className="app-input resize-none"
													/>
													<div>
														<button type="button" className="app-button app-button-ghost" onClick={() => setEditingMessage(null)}>
															{t.common.cancel}
														</button>
														<button type="button" className="app-button" onClick={submitEdit}>
															{t.common.save ?? 'Save'}
														</button>
													</div>
												</div>
											) : message.body || message.is_deleted ? (
												<p className="whitespace-pre-wrap text-sm leading-6 text-(--ink)">
													{message.is_deleted ? (t.workflow.labels.messageDeleted ?? 'Message deleted') : renderLinkedMessageBody(message.body, messageMentionUsers, tasks, projects)}
												</p>
											) : null}
											{message.edited_at && !message.is_deleted ? (
												<p className="workflow-chat-message-meta">{t.workflow.labels.edited ?? 'Edited'} - {message.edit_count}</p>
											) : null}
											{message.decision_at && !message.is_deleted ? (
												<div className="workflow-chat-decision-chip">
													<CheckCheck size={13} />
													<span>{t.workflow.labels.decision ?? 'Decision'}</span>
												</div>
											) : null}
											{!message.is_deleted && (messageReferences.tasks.length || messageReferences.projects.length) ? (
												<div className="workflow-chat-rich-previews">
													{messageReferences.tasks.map((task) => (
														<div key={`task-preview-${message.id}-${task.id}`} className="workflow-chat-rich-card workflow-chat-rich-task">
															<span><CheckSquare2 size={16} /></span>
															<div>
																<button type="button" onClick={() => setPreviewTarget({ kind: 'task', id: task.id })}>{task.title}</button>
																<small>{task.project.name} - {t.workflow.statuses[task.status] ?? task.status}</small>
															</div>
														</div>
													))}
													{messageReferences.projects.map((project) => (
														<div key={`project-preview-${message.id}-${project.id}`} className="workflow-chat-rich-card workflow-chat-rich-project">
															<span><BriefcaseBusiness size={16} /></span>
															<div>
																<button type="button" onClick={() => setPreviewTarget({ kind: 'project', id: project.id })}>{project.name}</button>
																<small>{t.workflow.statuses[project.status] ?? project.status}</small>
															</div>
														</div>
													))}
												</div>
											) : null}
											{!message.is_deleted && message.reactions.length ? (
												<div className="workflow-chat-reactions">
													{REACTION_OPTIONS.map(({ emoji, label, Icon }) => {
														const matchingReactions = message.reactions.filter((reaction) => reaction.emoji === emoji);
														const count = matchingReactions.length;
														if (!count) return null;
														const active = matchingReactions.some((reaction) => reaction.user.id === profile.id);
														return (
															<button
																key={emoji}
																type="button"
																className={active ? 'is-active' : ''}
																onClick={() => reactChatMessage({ id: message.id, emoji })}
																aria-label={label}
															>
																<Icon size={13} />
																<b>{count}</b>
															</button>
														);
													})}
												</div>
											) : null}
											{message.attachments.length ? (
												<div className="mt-2 space-y-2">
													{message.attachments.map((attachment) => {
														const attachmentUrl = resolveMediaUrl(attachment.file_url ?? attachment.file);
														if (isImageAttachment(attachment.mime_type, attachment.name, attachment.file_url ?? attachment.file)) {
															return (
															<button
																key={attachment.id}
																type="button"
																onClick={() =>
																	setSelectedImage({
																		src: attachmentUrl,
																		name: attachment.name,
																	})
																}
																className="workflow-chat-image-attachment"
															>
																<Image
																	src={attachmentUrl}
																	alt={attachment.name}
																	width={720}
																	height={288}
																	unoptimized
																	loading="eager"
																	className="w-full object-cover"
																/>
																<div className="workflow-chat-attachment-label">
																	<ImageIcon size={15} />
																	<span className="truncate">{attachment.name}</span>
																</div>
															</button>
															);
														}
														if (isAudioAttachment(attachment.mime_type, attachment.name, attachment.file_url ?? attachment.file)) {
															return (
																<VoiceMessagePlayer
																	key={attachment.id}
																	src={attachmentUrl}
																	seed={`${attachment.id}-${attachment.name}`}
																	label={t.workflow.buttons.voiceNote ?? 'Voice message'}
																/>
															);
														}
														return (
															<a
																key={attachment.id}
																href={attachmentUrl}
																target="_blank"
																rel="noreferrer"
																className="flex items-center gap-3 rounded-lg border border-[color:var(--line)] bg-white/70 px-3 py-3 text-sm font-semibold text-(--ink)"
															>
																<span className="grid h-9 w-9 place-items-center rounded-lg bg-(--surface-strong) text-[11px] font-bold text-(--ink)">
																	{fileIconLabel(attachment.name)}
																</span>
																<span className="truncate">{attachment.name}</span>
															</a>
														);
													})}
												</div>
											) : null}
											<p className="mt-2 text-right text-[11px] font-semibold text-(--ink-muted)">
												{formatTime(message.created_at, locale)} {mine ? (message.is_read ? (t.workflow.labels.read ?? 'Read') : (t.workflow.labels.sent ?? 'Sent')) : ''}
											</p>
										</div>
											{mine ? (
											<WorkflowAvatar
												user={{
													...message.sender,
													avatar: typeof profile.avatar === 'string' ? profile.avatar : message.sender.avatar,
												}}
												size={34}
												avatarClassName="workflow-chat-avatar"
											/>
											) : null}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>
				{typingNames ? (
					<div className="workflow-chat-typing">
						<MoreHorizontal size={15} />
						<span>{typingNames} {t.workflow.labels.typing ?? 'is typing'}</span>
					</div>
				) : null}
				<div className="workflow-chat-composer">
					{replyTarget ? (
						<div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-[color:var(--line)] bg-(--surface-muted) px-3 py-2">
							<div className="min-w-0">
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-(--accent-strong)">
									{t.workflow.labels.replyingTo ?? 'Replying to'}
								</p>
								<p className="truncate text-sm font-semibold text-(--ink)">{userLabel(replyTarget.sender)}</p>
								<p className="truncate text-sm text-(--ink-soft)">
									{readableReferenceText(replyTarget.body, tasks, projects) || (t.workflow.labels.messageDeleted ?? 'Message deleted')}
								</p>
							</div>
							<button type="button" onClick={() => setReplyTarget(null)} className="text-(--ink-soft) hover:text-(--ink)">
								<X size={16} />
							</button>
						</div>
					) : null}
					{recording ? (
						<div className="workflow-chat-recording-strip">
							<button
								type="button"
								onClick={() => stopVoiceRecording(true)}
								className="workflow-chat-recording-cancel"
								aria-label={t.common.cancel}
							>
								<Trash2 size={16} />
							</button>
							<div className="workflow-chat-recording-pulse">
								<Mic size={16} />
							</div>
							<div className="workflow-chat-recording-wave" aria-hidden="true">
								{Array.from({ length: 28 }, (_, index) => (
									<span key={`recording-${index}`} style={{ animationDelay: `${index * 42}ms` }} />
								))}
							</div>
							<strong>{formatAudioDuration(recordingSeconds)}</strong>
							<button
								type="button"
								onClick={() => stopVoiceRecording(false)}
								className="workflow-chat-recording-stop"
							>
								<Square size={14} />
								<span>{t.workflow.buttons.finishRecording ?? 'Finish'}</span>
							</button>
						</div>
					) : null}
					<div className="flex items-end gap-2">
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
							onChange={(event) => {
								const selectedFiles = Array.from(event.target.files ?? []);
								resetFiles();
								setFiles(selectedFiles);
								setFilePreviewUrls(selectedFiles.map((file) => URL.createObjectURL(file)));
							}}
							className="hidden"
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={!selectedThread?.id}
							className="app-pill grid h-11 w-11 place-items-center text-(--ink)"
							aria-label={t.workflow.buttons.shareFiles ?? 'Share files'}
						>
							<Paperclip size={18} />
						</button>
						<button
							type="button"
							onClick={toggleVoiceRecording}
							disabled={!selectedThread?.id}
							className={['app-pill grid h-11 w-11 place-items-center text-(--ink)', recording ? 'is-recording' : ''].join(' ')}
							aria-label={t.workflow.buttons.voiceNote ?? 'Voice note'}
						>
							<Mic size={18} />
						</button>
						<div className="relative flex-1">
							<textarea
								value={body}
								onChange={(event) => {
									setBody(event.target.value);
									emitTyping(Boolean(event.target.value.trim()));
								}}
								onSelect={(event) => {
									const target = event.currentTarget;
									setSelectedComposerText(target.value.slice(target.selectionStart, target.selectionEnd));
								}}
								onKeyDown={(event) => {
									if (mentionOptions.length) {
										if (event.key === 'ArrowDown') {
											event.preventDefault();
											setMentionActiveIndex((current) => (current + 1) % mentionOptions.length);
											return;
										}
										if (event.key === 'ArrowUp') {
											event.preventDefault();
											setMentionActiveIndex((current) => (current - 1 + mentionOptions.length) % mentionOptions.length);
											return;
										}
										if (event.key === 'Enter' && mentionMatch) {
											event.preventDefault();
											insertMention(mentionOptions[mentionActiveIndex] ?? mentionOptions[0]);
											return;
										}
									}
									if (!referenceOptions.length) return;
									if (event.key === 'ArrowDown') {
										event.preventDefault();
										setReferenceActiveIndex((current) => (current + 1) % referenceOptions.length);
									}
									if (event.key === 'ArrowUp') {
										event.preventDefault();
										setReferenceActiveIndex((current) => (current - 1 + referenceOptions.length) % referenceOptions.length);
									}
									if (event.key === 'Enter' && referenceMatch) {
										event.preventDefault();
										insertReference(referenceOptions[referenceActiveIndex] ?? referenceOptions[0]);
									}
								}}
								rows={2}
								placeholder={t.workflow.labels.messagePlaceholder ?? 'Message'}
								disabled={!selectedThread?.id}
								className="app-input min-h-[48px] w-full resize-none"
							/>
							{mentionOptions.length ? (
								<div className="absolute bottom-[calc(100%+8px)] left-0 z-[220] w-full rounded-lg border border-[color:var(--line)] bg-white p-2 shadow-(--shadow-lg)">
									{mentionOptions.map((user, index) => (
										<button
											key={user.id}
											type="button"
											onClick={() => insertMention(user)}
											className={['workflow-chat-mention-option', index === mentionActiveIndex ? 'is-active' : ''].join(' ')}
										>
											<WorkflowAvatar user={user} size={30} avatarClassName="workflow-chat-avatar" />
											<span className="truncate">{userLabel(user)}</span>
										</button>
									))}
								</div>
							) : null}
							{referenceOptions.length ? (
								<div className="absolute bottom-[calc(100%+8px)] left-0 z-[220] w-full rounded-lg border border-[color:var(--line)] bg-white p-2 shadow-(--shadow-lg)">
									{referenceOptions.map((reference, index) => (
										<button
											key={`${reference.kind}-${reference.id}`}
											type="button"
											onClick={() => insertReference(reference)}
											className={['workflow-chat-reference-option', index === referenceActiveIndex ? 'is-active' : ''].join(' ')}
										>
											<span>{reference.kind === 'task' ? <CheckSquare2 size={15} /> : <BriefcaseBusiness size={15} />}</span>
											<span className="min-w-0 flex-1">
												<b>{reference.title}</b>
												<small>
													{reference.kind === 'task' ? (t.workflow.labels.task ?? 'Task') : t.workflow.labels.project}
													{' - '}
													{reference.kind === 'project' ? statusLabelFor(reference.meta) : reference.meta}
												</small>
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
						{selectedComposerText.trim() ? (
							<button
								type="button"
								onClick={openCreateTaskFromSelection}
								className="app-button h-11 px-3"
								aria-label={t.workflow.buttons.createTaskFromSelection ?? 'Create task from selection'}
							>
								<CheckSquare2 size={16} />
							</button>
						) : null}
						<button
							type="button"
							onClick={submit}
							disabled={!selectedThread?.id || sendMessageState.isLoading || (!body.trim() && files.length === 0)}
							className="app-button h-11 px-4"
						>
							<Send size={16} />
						</button>
					</div>
					{files.length ? (
						<div className="workflow-chat-draft-attachments">
							<div className="flex flex-wrap gap-2">
								{files.map((file, index) => (
									isAudioAttachment(file.type, file.name, filePreviewUrls[index]) ? (
										<div key={`${file.name}-${index}`} className="workflow-chat-voice-draft">
											<button
												type="button"
												onClick={() => removeSelectedFile(index)}
												className="workflow-chat-voice-draft-remove"
												aria-label={t.common.delete}
											>
												<Trash2 size={15} />
											</button>
											<VoiceMessagePlayer
												src={filePreviewUrls[index]}
												seed={`${file.name}-${index}`}
												label={t.workflow.buttons.voiceNote ?? 'Voice message'}
												compact
											/>
										</div>
									) : (
										<div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-[color:var(--line)] bg-white">
											<button
												type="button"
												onClick={() => removeSelectedFile(index)}
												className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white"
												aria-label={t.common.delete}
											>
												<X size={12} />
											</button>
											{file.type.startsWith('image/') ? (
												<Image src={filePreviewUrls[index]} alt={file.name} width={80} height={80} unoptimized className="h-20 w-20 object-cover" />
											) : (
												<div className="flex h-20 min-w-[140px] items-center gap-2 px-3 text-xs font-semibold text-(--ink)">
													<Paperclip size={13} />
													<span className="line-clamp-2">{file.name}</span>
												</div>
											)}
										</div>
									)
								))}
							</div>
						</div>
					) : null}
				</div>
				</section>
			</div>
			{referencesOpen ? (
				<div className="workflow-chat-ref-overlay" onClick={() => setReferencesOpen(false)}>
					<aside className="workflow-chat-refs workflow-chat-refs-drawer" onClick={(event) => event.stopPropagation()}>
						<div className="workflow-chat-ref-drawer-head">
							<div className="workflow-chat-ref-drawer-title">
								<span>{drawerMode === 'decisions' ? <CheckCheck size={18} /> : drawerMode === 'media' ? <Images size={18} /> : <BriefcaseBusiness size={18} />}</span>
								<div>
									<p>
										{drawerMode === 'decisions'
											? (t.workflow.labels.decisions ?? 'Decisions')
											: drawerMode === 'media'
												? (t.workflow.labels.mediaFiles ?? 'Media files')
												: (t.workflow.labels.linkedReferences ?? 'Linked references')}
									</p>
									<small>
										{drawerMode === 'decisions'
											? decisionMessages.length
											: drawerMode === 'media'
												? mediaAttachments.length
												: linkedReferenceCount}{' '}
										{t.workflow.labels.items ?? 'items'}
									</small>
								</div>
							</div>
							<button type="button" onClick={() => setReferencesOpen(false)} aria-label={t.common.close ?? 'Close'}>
								<X size={16} />
							</button>
						</div>
						<div className="workflow-chat-ref-list">
							{drawerMode === 'references' ? (
								<>
									{linkedReferences.tasks.map((task) => (
										<button key={`task-${task.id}`} type="button" onClick={() => setPreviewTarget({ kind: 'task', id: task.id })} className="workflow-chat-ref-card workflow-chat-ref-task">
											<span><CheckSquare2 size={16} /></span>
											<b>{task.title}</b>
											<small>{task.project.name}</small>
										</button>
									))}
									{linkedReferences.projects.map((project) => (
										<button key={`project-${project.id}`} type="button" onClick={() => setPreviewTarget({ kind: 'project', id: project.id })} className="workflow-chat-ref-card workflow-chat-ref-project">
											<span><BriefcaseBusiness size={16} /></span>
											<b>{project.name}</b>
											<small>{statusLabelFor(project.status)}</small>
										</button>
									))}
								</>
							) : null}
							{drawerMode === 'decisions' ? decisionMessages.map((message) => (
								<button key={`decision-${message.id}`} type="button" onClick={() => scrollToMessage(message.id)} className="workflow-chat-ref-card workflow-chat-ref-decision">
									<span><CheckCheck size={16} /></span>
									<b>{readableReferenceText(message.body, tasks, projects) || (t.workflow.labels.messageDeleted ?? 'Message deleted')}</b>
									<small>{message.decision_by ? userLabel(message.decision_by) : t.workflow.labels.decision}</small>
								</button>
							)) : null}
							{drawerMode === 'media' ? mediaAttachments.map(({ message, attachment }) => (
								<a
									key={`media-${message.id}-${attachment.id}`}
									href={resolveMediaUrl(attachment.file_url ?? attachment.file)}
									target="_blank"
									rel="noreferrer"
									className="workflow-chat-ref-card workflow-chat-ref-media"
								>
									<span>{isImageAttachment(attachment.mime_type, attachment.name, attachment.file_url ?? attachment.file) ? <ImageIcon size={16} /> : <FileText size={16} />}</span>
									<b>{attachment.name}</b>
									<small>{userLabel(message.sender)}</small>
								</a>
							)) : null}
							{((drawerMode === 'references' && !linkedReferences.tasks.length && !linkedReferences.projects.length) || (drawerMode === 'decisions' && !decisionMessages.length) || (drawerMode === 'media' && !mediaAttachments.length)) ? (
								<div className="workflow-chat-ref-empty">
									<span><CheckSquare2 size={18} /></span>
									<span>{drawerMode === 'references' ? (t.workflow.labels.chatReferencesEmpty ?? 'Use # to link tasks and projects.') : (t.workflow.labels.emptyState ?? 'Nothing here yet.')}</span>
								</div>
							) : null}
						</div>
					</aside>
				</div>
			) : null}
			{previewTarget && (previewTask || previewProject) ? (
				<div className="workflow-chat-ref-overlay" onClick={() => setPreviewTarget(null)}>
					<aside className="workflow-chat-refs workflow-chat-preview-drawer" onClick={(event) => event.stopPropagation()}>
						<div className="workflow-chat-ref-drawer-head">
							<div className="workflow-chat-ref-drawer-title">
								<span>{previewTask ? <CheckSquare2 size={18} /> : <BriefcaseBusiness size={18} />}</span>
								<div>
									<p>{previewTask ? previewTask.title : previewProject?.name}</p>
									<small>{previewTask ? previewTask.project.name : statusLabelFor(previewProject?.status)}</small>
								</div>
							</div>
							<button type="button" onClick={() => setPreviewTarget(null)} aria-label={t.common.close ?? 'Close'}>
								<X size={16} />
							</button>
						</div>
						<div className="workflow-chat-preview-body">
							<p>{previewTask ? previewTask.description : previewProject?.description}</p>
							<div className="workflow-chat-preview-meta">
								<span>{previewTask ? (t.workflow.statuses[previewTask.status] ?? previewTask.status) : (previewProject ? t.workflow.statuses[previewProject.status] ?? previewProject.status : '')}</span>
								<span>{previewTask?.current_assignee ? userLabel(previewTask.current_assignee) : previewProject?.manager ? userLabel(previewProject.manager) : ''}</span>
							</div>
							<Link href={previewTask ? DASHBOARD_TASK_VIEW(previewTask.id) : DASHBOARD_PROJECT_VIEW(previewProject!.id)} className="app-button">
								{t.workflow.buttons.open ?? 'Open'}
							</Link>
						</div>
					</aside>
				</div>
			) : null}
			{forwardMessage ? (
				<div className="workflow-chat-create-modal" onClick={() => setForwardMessage(null)}>
					<div className="workflow-chat-create-card" onClick={(event) => event.stopPropagation()}>
						<div className="workflow-chat-create-head">
							<span><Forward size={18} /></span>
							<div>
								<p>{t.workflow.buttons.forwardMessage ?? 'Forward message'}</p>
								<small>{readableReferenceText(forwardMessage.body, tasks, projects)}</small>
							</div>
						</div>
						<div className="workflow-chat-forward-list">
							{chatThreads.map((thread) => (
								<button key={thread.id} type="button" onClick={() => forwardToThread(thread)}>
									<Users size={16} />
									<span>{threadTitle(thread, profile.id, t.workflow.labels.publicStudio ?? 'Studio public', t.workflow.labels.privateChat ?? 'Private chat', t.workflow.labels.projectRoom ?? 'Project room', t.workflow.labels.taskRoom ?? 'Task room')}</span>
								</button>
							))}
						</div>
					</div>
				</div>
			) : null}
			{reminderMessage ? (
				<div className="workflow-chat-create-modal" onClick={() => setReminderMessage(null)}>
					<form
						className="workflow-chat-create-card"
						onClick={(event) => event.stopPropagation()}
						onSubmit={(event) => {
							event.preventDefault();
							void submitReminder();
						}}
					>
						<div className="workflow-chat-create-head">
							<span><AlarmClock size={18} /></span>
							<div>
								<p>{t.workflow.buttons.addReminder ?? 'Add reminder'}</p>
								<small>{readableReferenceText(reminderMessage.body, tasks, projects)}</small>
							</div>
						</div>
						<label className="workflow-form-field">
							<span>{t.workflow.labels.task ?? 'Task'}</span>
							<select
								value={reminderDraft.taskId}
								onChange={(event) => setReminderDraft((current) => ({ ...current, taskId: event.target.value }))}
								className="app-input"
							>
								<option key="reminder-no-task" value="">{t.workflow.labels.noTask ?? 'No task'}</option>
								{tasks.map((task, index) => (
									<option key={`reminder-task-${task.id}-${index}`} value={task.id}>{task.title}</option>
								))}
							</select>
						</label>
						<label className="workflow-form-field">
							<span>{t.workflow.labels.remindAt ?? 'Remind at'}</span>
							<div className="workflow-chat-date-field workflow-chat-date-field-full">
								<CalendarDays size={18} />
								<input
									type="datetime-local"
									value={reminderDraft.remindAt}
									onChange={(event) => setReminderDraft((current) => ({ ...current, remindAt: event.target.value }))}
								/>
								{reminderDraft.remindAt ? (
									<button
										type="button"
										onClick={() => setReminderDraft((current) => ({ ...current, remindAt: '' }))}
										aria-label={t.common.clearSelection}
									>
										<X size={15} />
									</button>
								) : null}
							</div>
						</label>
						<label className="workflow-form-field">
							<span>{t.workflow.labels.note ?? 'Note'}</span>
							<input
								value={reminderDraft.note}
								onChange={(event) => setReminderDraft((current) => ({ ...current, note: event.target.value }))}
								className="app-input"
							/>
						</label>
						<div className="workflow-chat-create-actions">
							<button type="button" className="app-button app-button-ghost" onClick={() => setReminderMessage(null)}>
								{t.common.cancel}
							</button>
							<button type="submit" className="app-button">
								<AlarmClock size={16} />
								{t.workflow.buttons.addReminder ?? 'Add reminder'}
							</button>
						</div>
					</form>
				</div>
			) : null}
			{taskModalOpen ? (
				<div className="workflow-chat-create-modal" onClick={() => setTaskModalOpen(false)}>
					<form
						className="workflow-chat-create-card"
						onClick={(event) => event.stopPropagation()}
						onSubmit={(event) => {
							event.preventDefault();
							void submitTaskFromMessage();
						}}
					>
						<div className="workflow-chat-create-head">
							<span><CheckSquare2 size={18} /></span>
							<div>
								<p>{t.workflow.buttons.createTaskFromMessage ?? 'Create task from message'}</p>
								<small>{taskSourceMessage ? userLabel(taskSourceMessage.sender) : (t.workflow.labels.selectedText ?? 'Selected text')}</small>
							</div>
						</div>
						<label className="workflow-form-field">
							<span>{t.workflow.labels.taskTitle}</span>
							<input
								value={taskDraft.title}
								onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
								className="app-input"
							/>
						</label>
						<label className="workflow-form-field">
							<span>{t.workflow.labels.project}</span>
							<select
								value={taskDraft.projectId}
								onChange={(event) => setTaskDraft((current) => ({ ...current, projectId: event.target.value }))}
								className="app-input"
							>
								{projects.map((project, index) => (
									<option key={`task-project-${project.id}-${index}`} value={project.id}>{project.name}</option>
								))}
							</select>
						</label>
						<label className="workflow-form-field">
							<span>{t.workflow.labels.description}</span>
							<textarea
								value={taskDraft.description}
								onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))}
								rows={5}
								className="app-input resize-none"
							/>
						</label>
						<div className="workflow-chat-create-actions">
							<button type="button" className="app-button app-button-ghost" onClick={() => setTaskModalOpen(false)}>
								{t.common.cancel}
							</button>
							<button type="submit" className="app-button" disabled={createTaskState.isLoading || !taskDraft.title.trim() || !taskDraft.projectId}>
								<CheckSquare2 size={16} />
								{t.workflow.buttons.createTask ?? 'Create task'}
							</button>
						</div>
					</form>
				</div>
			) : null}
			{selectedImage ? (
				<div className="fixed inset-0 z-[260] grid place-items-center bg-black/75 p-4" onClick={() => setSelectedImage(null)}>
					<div className="relative max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							onClick={() => setSelectedImage(null)}
							className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white"
						>
							<X size={18} />
						</button>
						<Image src={selectedImage.src} alt={selectedImage.name} width={1200} height={900} unoptimized className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
					</div>
				</div>
			) : null}
			{deleteTargetMessage ? (
				<div className="workflow-chat-confirm-overlay" onClick={() => setDeleteTargetMessage(null)}>
					<div className="workflow-chat-confirm-modal" onClick={(event) => event.stopPropagation()}>
						<span>
							<Trash2 size={20} />
						</span>
						<div>
							<h3>{t.workflow.labels.deleteMessageTitle ?? 'Delete message?'}</h3>
							<p>{t.workflow.labels.deleteMessageBody ?? 'This message will be archived and hidden from the conversation.'}</p>
						</div>
						<div className="workflow-chat-confirm-actions">
							<button type="button" className="app-button app-button-ghost" onClick={() => setDeleteTargetMessage(null)}>
								{t.common.cancel}
							</button>
							<button type="button" className="app-button workflow-chat-danger-button" onClick={confirmDeleteMessage}>
								<Trash2 size={16} />
								{t.common.delete}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default DesignWorkflowChat;
