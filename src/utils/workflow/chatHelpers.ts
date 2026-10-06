import type { ChatMessage, ChatThread, ProjectSummary, TaskCard, WorkflowUser } from '@/types/designWorkflowTypes';
import type { ChatSidebarSection } from '@/types/workflowChatTypes';
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];

export const isSocketRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

export const formatTime = (value: string, locale: string) =>
	new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export const formatAudioDuration = (value: number) => {
	if (!Number.isFinite(value) || value <= 0) return '0:00';
	const minutes = Math.floor(value / 60);
	const seconds = Math.floor(value % 60)
		.toString()
		.padStart(2, '0');
	return `${minutes}:${seconds}`;
};

export const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	return `${API_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

export const isImageAttachment = (mimeType: string, name: string, url?: string | null) =>
	mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || url || '');

export const isAudioAttachment = (mimeType: string, name: string, url?: string | null) =>
	mimeType.startsWith('audio/') || /\.(webm|mp3|m4a|wav|ogg|oga|aac)$/i.test(name || url || '');

export const fileIconLabel = (name: string) => name.split('.').pop()?.toUpperCase() || 'FILE';

export const userLabel = (user: WorkflowUser) => `${user.first_name} ${user.last_name}`.trim() || user.email;

export const mentionTokenFor = (user: WorkflowUser) => user.email.split('@', 1)[0].toLowerCase();

export const referenceSlugFor = (title: string) =>
	title
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64) || 'reference';

export const referenceTokenFor = (title: string) => `#${referenceSlugFor(title)}`;

export const extractReferenceIds = (body: string, tasks: TaskCard[] = [], projects: ProjectSummary[] = []) => {
	const taskIds = Array.from(body.matchAll(/#T(\d+)/gi), (match) => Number(match[1])).filter(Number.isFinite);
	const projectIds = Array.from(body.matchAll(/#P(\d+)/gi), (match) => Number(match[1])).filter(Number.isFinite);
	const taskByToken = new Map(tasks.map((task) => [referenceTokenFor(task.title).toLowerCase(), task.id]));
	const projectByToken = new Map(
		projects.map((project) => [referenceTokenFor(project.name).toLowerCase(), project.id]),
	);
	Array.from(body.matchAll(/#[\w-]+/g), (match) => match[0].toLowerCase()).forEach((token) => {
		if (/^#[tp]\d+$/i.test(token)) return;
		const taskId = taskByToken.get(token);
		const projectId = projectByToken.get(token);
		if (taskId) taskIds.push(taskId);
		if (projectId) projectIds.push(projectId);
	});
	return { taskIds, projectIds };
};

export const readableReferenceText = (body: string, tasks: TaskCard[] = [], projects: ProjectSummary[] = []) => {
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

export const tomorrowIsoDate = () => {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return date.toISOString().slice(0, 10);
};

export const detectDueDate = (body: string) => {
	const lower = body.toLowerCase();
	if (/\btomorrow\b|\bdemain\b/.test(lower)) return tomorrowIsoDate();
	const match = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
	return match?.[1] ?? null;
};

export const linkedReferencesForBody = (body: string, tasks: TaskCard[], projects: ProjectSummary[]) => {
	const refs = extractReferenceIds(body, tasks, projects);
	return {
		tasks: tasks.filter((task) => refs.taskIds.includes(task.id)),
		projects: projects.filter((project) => refs.projectIds.includes(project.id)),
	};
};

export const threadTitle = (
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

export const sectionForThread = (thread?: ChatThread | null): ChatSidebarSection => {
	if (thread?.kind === 'project') return 'projects';
	if (thread?.kind === 'private') return 'direct';
	return 'studio';
};

export const threadPreview = (
	thread: ChatThread,
	currentUserId: number,
	labels: {
		deleted: string;
		photo: string;
		attachment: string;
		noMessage: string;
		you: string;
	},
	tasks: TaskCard[] = [],
	projects: ProjectSummary[] = [],
) => {
	const message = thread.last_message;
	if (!message) return { text: labels.noMessage, kind: 'text' as const };
	const prefix = message.sender.id === currentUserId ? `${labels.you}: ` : '';
	if (message.is_deleted) return { text: `${prefix}${labels.deleted}`, kind: 'text' as const };
	const firstAttachment = message.attachments[0];
	if (firstAttachment) {
		const isImage = isImageAttachment(
			firstAttachment.mime_type,
			firstAttachment.name,
			firstAttachment.file_url ?? firstAttachment.file,
		);
		return {
			text: `${prefix}${isImage ? labels.photo : labels.attachment}`,
			kind: isImage ? ('photo' as const) : ('attachment' as const),
		};
	}
	const readableBody = readableReferenceText(message.body, tasks, projects);
	return { text: `${prefix}${readableBody || labels.noMessage}`, kind: 'text' as const };
};

export const formatDayLabel = (value: string, todayLabel: string, yesterdayLabel: string, locale: string) => {
	const date = new Date(value);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	if (date.toDateString() === today.toDateString()) return todayLabel;
	if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;
	return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
};

export const dedupeMessages = (messages: ChatMessage[]) => {
	const seen = new Set<number>();
	return messages.filter((message) => {
		if (seen.has(message.id)) return false;
		seen.add(message.id);
		return true;
	});
};

export const scrollToMessage = (id: number) => {
	const element = document.getElementById(`chat-message-${id}`);
	if (!element) return;
	element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	element.classList.add('is-highlighted');
	window.setTimeout(() => element.classList.remove('is-highlighted'), 1500);
};
