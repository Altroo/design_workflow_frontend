'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ImageIcon, Paperclip, Reply, Search, Send, Trash2, Users, X } from 'lucide-react';
import {
	useCreateChatThreadMutation,
	useDeleteChatMessageMutation,
	useGetChatMessagesQuery,
	useGetChatThreadsQuery,
	useLazyGetChatMessagesQuery,
	useMarkChatMessageReadMutation,
	useSendChatMessageMutation,
} from '@/store/services/designWorkflow';
import { useGetUsersListQuery } from '@/store/services/account';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getAccessToken, getProfilState } from '@/store/selectors';
import type { ChatMessage, ChatThread, WorkflowUser } from '@/types/designWorkflowTypes';
import type { UserClass } from '@/models/classes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const WS_URL = API_URL.replace(/^http/, 'ws');
const PAGE_SIZE = 40;
const OTHER_BUBBLE_COLORS = [
	'border-sky-200 bg-sky-50',
	'border-violet-200 bg-violet-50',
	'border-amber-200 bg-amber-50',
	'border-rose-200 bg-rose-50',
	'border-teal-200 bg-teal-50',
];

const formatTime = (value: string) =>
	new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	return `${API_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const isImageAttachment = (mimeType: string, name: string, url?: string | null) =>
	mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || url || '');

const fileIconLabel = (name: string) => name.split('.').pop()?.toUpperCase() || 'FILE';

const userLabel = (user: WorkflowUser) => `${user.first_name} ${user.last_name}`.trim() || user.email;

const threadTitle = (thread: ChatThread, currentUserId?: number, publicLabel = 'Studio public', privateLabel = 'Private chat') => {
	if (thread.kind === 'public') return thread.title || publicLabel;
	const other = thread.participants.find((user) => user.id !== currentUserId);
	return other ? userLabel(other) : thread.title || privateLabel;
};

const formatDayLabel = (value: string, todayLabel: string, yesterdayLabel: string) => {
	const date = new Date(value);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	if (date.toDateString() === today.toDateString()) return todayLabel;
	if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;
	return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
};

const Avatar = ({ user, size = 32 }: { user: WorkflowUser; size?: number }) => {
	const avatarUrl = resolveMediaUrl(user.avatar);
	const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? user.email?.[0] ?? ''}`.trim().toUpperCase() || 'U';
	if (avatarUrl) {
		return <img src={avatarUrl} alt={userLabel(user)} className="rounded-full object-cover" style={{ width: size, height: size }} />;
	}
	return (
		<span
			className="grid place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-bold text-[var(--ink)]"
			style={{ width: size, height: size }}
		>
			{initials}
		</span>
	);
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
	const { t } = useLanguage();
	const profile = useAppSelector(getProfilState);
	const token = useAppSelector(getAccessToken);
	const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
	const [body, setBody] = useState('');
	const [files, setFiles] = useState<File[]>([]);
	const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
	const [socketConnected, setSocketConnected] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
	const [hasOlder, setHasOlder] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
	const [selectedImage, setSelectedImage] = useState<{ src: string; name: string } | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const markedReadIdsRef = useRef<Set<number>>(new Set());

	const { data: threads = [], refetch: refetchThreads } = useGetChatThreadsQuery();
	const selectedThread = useMemo(
		() => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
		[threads, selectedThreadId],
	);
	const { data: currentMessages = [], refetch: refetchMessages } = useGetChatMessagesQuery(
		{ threadId: selectedThread?.id ?? 0, limit: PAGE_SIZE, q: searchTerm || undefined },
		{ skip: !selectedThread?.id },
	);
	const [loadOlderMessages] = useLazyGetChatMessagesQuery();
	const [createThread] = useCreateChatThreadMutation();
	const [sendMessage, sendMessageState] = useSendChatMessageMutation();
	const [markRead] = useMarkChatMessageReadMutation();
	const [deleteChatMessage] = useDeleteChatMessageMutation();

	const usersResponse = useGetUsersListQuery({ with_pagination: false });
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

	useEffect(() => {
		if (!selectedThreadId && threads[0]) {
			setSelectedThreadId(threads[0].id);
		}
	}, [selectedThreadId, threads]);

	useEffect(() => {
		setOlderMessages([]);
		setHasOlder(false);
		markedReadIdsRef.current.clear();
	}, [selectedThread?.id, searchTerm]);

	useEffect(() => {
		setHasOlder(currentMessages.length >= PAGE_SIZE);
	}, [currentMessages]);

	useEffect(() => () => filePreviewUrls.forEach((url) => URL.revokeObjectURL(url)), [filePreviewUrls]);

	useEffect(() => {
		if (!WS_URL || !token) return;
		const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
		ws.onopen = () => setSocketConnected(true);
		ws.onclose = () => setSocketConnected(false);
		ws.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data);
				if (['chat_message', 'chat_read', 'chat_deleted'].includes(payload.type)) {
					refetchThreads();
					refetchMessages();
				}
			} catch {
				refetchThreads();
			}
		};
		return () => ws.close();
	}, [refetchMessages, refetchThreads, token]);

	const messageList = useMemo(
		() => dedupeMessages([...olderMessages, ...currentMessages]),
		[olderMessages, currentMessages],
	);

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

	const mentionMatch = body.match(/@([\w.-]*)$/);
	const mentionOptions = useMemo(() => {
		if (!mentionMatch) return [];
		const query = mentionMatch[1].toLowerCase();
		return users
			.filter((user) => {
				const localPart = user.email.split('@', 1)[0].toLowerCase();
				return !query || user.first_name.toLowerCase().includes(query) || user.last_name.toLowerCase().includes(query) || localPart.includes(query);
			})
			.slice(0, 6);
	}, [mentionMatch, users]);

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
		setReplyTarget(null);
		resetFiles();
		requestAnimationFrame(() => {
			if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		});
	};

	const insertMention = (user: WorkflowUser) => {
		const localPart = user.email.split('@', 1)[0];
		setBody((current) => current.replace(/@([\w.-]*)$/, `@${localPart} `));
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
		<div className="grid min-h-[calc(100vh-142px)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
			<aside className="app-card overflow-hidden p-3">
				<div className="border-b border-[color:var(--line)] pb-3">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
						{t.workflow.labels.chatTitle ?? 'Studio chat'}
					</p>
					<p className="mt-1 text-sm text-[var(--ink-soft)]">
						{socketConnected
							? (t.workflow.labels.liveConversations ?? 'Conversations en direct')
							: (t.workflow.labels.chatAvailable ?? 'Chat disponible')}
					</p>
				</div>
				<div className="mt-3 space-y-2">
					{threads.map((thread) => {
						const peer = thread.participants.find((user) => user.id !== profile.id) ?? thread.participants[0];
						return (
							<button
								key={thread.id}
								type="button"
								onClick={() => setSelectedThreadId(thread.id)}
								className={[
									'app-pill flex w-full items-center gap-3 px-3 py-3 text-left',
									selectedThread?.id === thread.id ? 'border-[color:var(--accent)] bg-[var(--accent-soft)]' : '',
								].join(' ')}
							>
								{peer ? <Avatar user={peer} size={32} /> : <Users size={16} />}
								<span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
									{threadTitle(
										thread,
										profile.id,
										t.workflow.labels.publicStudio ?? 'Studio public',
										t.workflow.labels.privateChat ?? 'Private chat',
									)}
								</span>
								{thread.unread_count ? (
									<span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[11px] font-bold text-white">
										{thread.unread_count}
									</span>
								) : null}
							</button>
						);
					})}
				</div>
				<div className="mt-4 border-t border-[color:var(--line)] pt-3">
					<p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
						{t.workflow.labels.privateConversations ?? 'Private'}
					</p>
					<div className="max-h-64 space-y-2 overflow-y-auto pr-1">
						{users.map((user) => (
							<button
								key={user.id}
								type="button"
								onClick={async () => {
									const thread = await createThread({ kind: 'private', recipient_id: user.id }).unwrap();
									setSelectedThreadId(thread.id);
								}}
								className="app-pill flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
							>
								<Avatar user={user} size={28} />
								<span className="truncate">{userLabel(user)}</span>
							</button>
						))}
					</div>
				</div>
			</aside>

			<section className="app-card flex min-h-0 flex-col overflow-hidden">
				<div className="border-b border-[color:var(--line)] px-5 py-4">
					<div className="flex flex-wrap items-center gap-3">
						<div>
							<p className="text-lg font-bold text-[var(--ink)]">
								{selectedThread
									? threadTitle(
											selectedThread,
											profile.id,
											t.workflow.labels.publicStudio ?? 'Studio public',
											t.workflow.labels.privateChat ?? 'Private chat',
										)
									: (t.workflow.labels.chatTitle ?? 'Chat')}
							</p>
							<p className="text-sm text-[var(--ink-soft)]">
								{t.workflow.labels.chatAvailableDescription ?? 'Images, fichiers, reponses et suivi de lecture.'}
							</p>
						</div>
						<label className="app-pill ml-auto flex min-w-[220px] items-center gap-2 px-3 py-2 text-sm text-[var(--ink-soft)]">
							<Search size={15} />
							<input
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder={t.workflow.labels.searchMessages ?? t.workflow.labels.search}
								className="min-w-0 flex-1 bg-transparent outline-none"
							/>
						</label>
					</div>
				</div>
				<div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[var(--surface-muted)] p-4">
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
								className="app-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--ink)]"
							>
								<ArrowDown size={15} />
								<span>{loadingOlder ? (t.common.loading ?? 'Chargement...') : (t.workflow.buttons.loadOlder ?? 'Load older')}</span>
							</button>
						</div>
					) : null}

					{groupedMessages.map((group) => (
						<div key={group.day} className="space-y-3">
							<div className="flex justify-center">
								<span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
									{formatDayLabel(
										group.items[0].created_at,
										t.workflow.labels.today ?? 'Today',
										t.workflow.labels.yesterday ?? 'Yesterday',
									)}
								</span>
							</div>
							{group.items.map((message) => {
								const mine = message.sender.id === profile.id;
								const bubbleTone = mine
									? 'border-emerald-200 bg-emerald-50'
									: OTHER_BUBBLE_COLORS[message.sender.id % OTHER_BUBBLE_COLORS.length];
								return (
									<div key={message.id} className={['flex items-end gap-3', mine ? 'justify-end' : 'justify-start'].join(' ')}>
										{!mine ? <Avatar user={message.sender} size={34} /> : null}
										<div className={['max-w-[82%] rounded-[8px] border px-4 py-3 shadow-[var(--shadow-sm)]', bubbleTone].join(' ')}>
											<div className="mb-2 flex items-start justify-between gap-3">
												<p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
													{mine ? (t.workflow.labels.you ?? 'You') : userLabel(message.sender)}
												</p>
												<div className="flex items-center gap-2 text-[var(--ink-soft)]">
													<button
														type="button"
														onClick={() => setReplyTarget(message)}
														className="hover:text-[var(--ink)]"
														aria-label={t.workflow.buttons.reply ?? 'Reply'}
													>
														<Reply size={15} />
													</button>
													{mine && !message.is_deleted ? (
														<button
															type="button"
															onClick={() => deleteChatMessage(message.id)}
															className="hover:text-red-600"
															aria-label={t.workflow.buttons.deleteMessage ?? 'Delete message'}
														>
															<Trash2 size={15} />
														</button>
													) : null}
												</div>
											</div>
											{message.reply_to ? (
												<div className="mb-2 rounded-[8px] border border-black/8 bg-white/70 px-3 py-2 text-xs text-[var(--ink-soft)]">
													<p className="font-semibold text-[var(--ink)]">{userLabel(message.reply_to.sender)}</p>
													<p className="mt-1 line-clamp-2">{message.reply_to.body}</p>
												</div>
											) : null}
											{message.body ? <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{message.body}</p> : null}
											{message.attachments.length ? (
												<div className="mt-2 space-y-2">
													{message.attachments.map((attachment) =>
														isImageAttachment(attachment.mime_type, attachment.name, attachment.file_url ?? attachment.file) ? (
															<button
																key={attachment.id}
																type="button"
																onClick={() =>
																	setSelectedImage({
																		src: resolveMediaUrl(attachment.file_url ?? attachment.file),
																		name: attachment.name,
																	})
																}
																className="block w-full overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-white/70 text-left"
															>
																<img
																	src={resolveMediaUrl(attachment.file_url ?? attachment.file)}
																	alt={attachment.name}
																	className="max-h-72 w-full object-cover"
																	loading="lazy"
																/>
																<div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--ink)]">
																	<ImageIcon size={15} />
																	<span className="truncate">{attachment.name}</span>
																</div>
															</button>
														) : (
															<a
																key={attachment.id}
																href={resolveMediaUrl(attachment.file_url ?? attachment.file)}
																target="_blank"
																rel="noreferrer"
																className="flex items-center gap-3 rounded-[8px] border border-[color:var(--line)] bg-white/70 px-3 py-3 text-sm font-semibold text-[var(--ink)]"
															>
																<span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[var(--surface-strong)] text-[11px] font-bold text-[var(--ink)]">
																	{fileIconLabel(attachment.name)}
																</span>
																<span className="truncate">{attachment.name}</span>
															</a>
														),
													)}
												</div>
											) : null}
											<p className="mt-2 text-right text-[11px] font-semibold text-[var(--ink-muted)]">
												{formatTime(message.created_at)} {mine ? (message.is_read ? (t.workflow.labels.read ?? 'Read') : (t.workflow.labels.sent ?? 'Sent')) : ''}
											</p>
										</div>
										{mine ? (
											<Avatar
												user={{
													...message.sender,
													avatar: typeof profile.avatar === 'string' ? profile.avatar : message.sender.avatar,
												}}
												size={34}
											/>
										) : null}
									</div>
								);
							})}
						</div>
					))}
				</div>
				<div className="border-t border-[color:var(--line)] bg-white p-3">
					{replyTarget ? (
						<div className="mb-3 flex items-start justify-between gap-3 rounded-[8px] border border-[color:var(--line)] bg-[var(--surface-muted)] px-3 py-2">
							<div className="min-w-0">
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
									{t.workflow.labels.replyingTo ?? 'Replying to'}
								</p>
								<p className="truncate text-sm font-semibold text-[var(--ink)]">{userLabel(replyTarget.sender)}</p>
								<p className="truncate text-sm text-[var(--ink-soft)]">
									{replyTarget.body || (t.workflow.labels.messageDeleted ?? 'Message deleted')}
								</p>
							</div>
							<button type="button" onClick={() => setReplyTarget(null)} className="text-[var(--ink-soft)] hover:text-[var(--ink)]">
								<X size={16} />
							</button>
						</div>
					) : null}
					<div className="flex items-end gap-2">
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
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
							className="app-pill grid h-11 w-11 place-items-center text-[var(--ink)]"
							aria-label={t.workflow.buttons.shareFiles ?? 'Share files'}
						>
							<Paperclip size={18} />
						</button>
						<div className="relative flex-1">
							<textarea
								value={body}
								onChange={(event) => setBody(event.target.value)}
								rows={2}
								placeholder={t.workflow.labels.messagePlaceholder ?? 'Message'}
								className="app-input min-h-[48px] w-full resize-none"
							/>
							{mentionOptions.length ? (
								<div className="absolute bottom-[calc(100%+8px)] left-0 z-[220] w-full rounded-[8px] border border-[color:var(--line)] bg-white p-2 shadow-[var(--shadow-lg)]">
									{mentionOptions.map((user) => (
										<button
											key={user.id}
											type="button"
											onClick={() => insertMention(user)}
											className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]"
										>
											<Avatar user={user} size={30} />
											<span className="truncate">{userLabel(user)}</span>
										</button>
									))}
								</div>
							) : null}
						</div>
						<button
							type="button"
							onClick={submit}
							disabled={sendMessageState.isLoading || (!body.trim() && files.length === 0)}
							className="app-button h-11 px-4"
						>
							<Send size={16} />
						</button>
					</div>
					{files.length ? (
						<div className="mt-2 space-y-2">
							<p className="text-xs font-semibold text-[var(--ink-soft)]">
								{files.length} {t.workflow.labels.readyAttachments ?? 'attachment(s) ready'}
							</p>
							<div className="flex flex-wrap gap-2">
								{files.map((file, index) => (
									<div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-[8px] border border-[color:var(--line)] bg-white">
										<button
											type="button"
											onClick={() => removeSelectedFile(index)}
											className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white"
											aria-label={t.common.delete}
										>
											<X size={12} />
										</button>
										{file.type.startsWith('image/') ? (
											<img src={filePreviewUrls[index]} alt={file.name} className="h-20 w-20 object-cover" />
										) : (
											<div className="flex h-20 min-w-[140px] items-center gap-2 px-3 text-xs font-semibold text-[var(--ink)]">
												<Paperclip size={13} />
												<span className="line-clamp-2">{file.name}</span>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					) : null}
				</div>
			</section>
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
						<img src={selectedImage.src} alt={selectedImage.name} className="max-h-[90vh] max-w-[90vw] rounded-[8px] object-contain" />
					</div>
				</div>
			) : null}
		</div>
	);
};

export default DesignWorkflowChat;
