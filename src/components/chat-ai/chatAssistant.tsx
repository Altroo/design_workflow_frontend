'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
	Bot,
	Clock3,
	LoaderCircle,
	MessageSquarePlus,
	Send,
	Square,
	ThumbsDown,
	ThumbsUp,
	Trash2,
	X,
} from 'lucide-react';
import { useAppSelector, useIsClient, useLanguage } from '@/utils/hooks';
import { getAccessToken, getProfilState } from '@/store/selectors';
import { useChatAssistant } from '@/utils/chat-ai/hooks/useChatAssistant';
import { safeChatNavigation } from '@/utils/chat-ai/chatHelpers';
import { ChatResults } from './chatResults';
import { ChatConfirmation } from './chatConfirmation';
import AiAssistantDialog from '@/components/shared/aiAssistantControl/aiAssistantDialog';
import type { ChatConfirmation as Confirmation, ChatNavigation } from '@/types/chatAiTypes';
import styles from './chatAssistant.module.css';

export const EnabledChatAssistant = ({ token }: { token: string }) => {
	const model = useChatAssistant(token);
	const { t, language } = useLanguage();
	const copy = t.chatAi;
	const router = useRouter();
	const [history, setHistory] = useState(false);
	const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
	const [deleting, setDeleting] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<Record<string, boolean>>({});
	const input = useRef<HTMLTextAreaElement>(null);
	const panel = useRef<HTMLElement>(null);
	const scroll = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!model.open) return;
		const opener = trigger.current;
		input.current?.focus();
		const viewport = window.visualViewport;
		const resize = () => {
			panel.current?.style.setProperty('--assistant-height', `${viewport?.height ?? window.innerHeight}px`);
			panel.current?.style.setProperty('--assistant-top', `${viewport?.offsetTop ?? 0}px`);
		};
		resize();
		viewport?.addEventListener('resize', resize);
		viewport?.addEventListener('scroll', resize);
		return () => {
			viewport?.removeEventListener('resize', resize);
			viewport?.removeEventListener('scroll', resize);
			opener?.focus();
		};
	}, [model.open]);
	useEffect(() => {
		if (scroll.current && model.open) scroll.current.scrollTop = scroll.current.scrollHeight;
	}, [model.messages.length, model.streamText, model.busy, model.open]);

	const navigate = (target: ChatNavigation) => {
		const href = safeChatNavigation(target, model.capabilities?.can_report ?? false);
		if (!href) return;
		router.push(href);
		if (window.matchMedia('(max-width: 640px)').matches) model.close();
	};
	const acknowledge = (id: string, useful: boolean) => {
		setFeedback((current) => ({ ...current, [id]: useful }));
		void model.feedback(id, useful);
	};
	return createPortal(
		<>
			<button
				ref={trigger}
				className={styles.launcher}
				aria-label={copy.open}
				aria-expanded={model.open}
				aria-controls="workflow-chat-assistant"
				hidden={model.open}
				onClick={() => model.setOpen(true)}
			>
				<Bot size={23} />
				<span>{copy.title}</span>
			</button>
			<aside
				ref={panel}
				id="workflow-chat-assistant"
				aria-label={copy.title}
				className={styles.panel}
				hidden={!model.open}
				onKeyDown={(event) => {
					if (event.key === 'Escape' && !confirmation && !deleting) {
						event.stopPropagation();
						model.close();
					}
					if (event.key === 'Tab' && window.matchMedia('(max-width: 640px)').matches) {
						const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea');
						if (!controls?.length) return;
						const first = controls[0],
							last = controls[controls.length - 1];
						if (event.shiftKey && document.activeElement === first) {
							event.preventDefault();
							last.focus();
						} else if (!event.shiftKey && document.activeElement === last) {
							event.preventDefault();
							first.focus();
						}
					}
				}}
			>
				<header className={styles.header}>
					<span className={styles.botIcon}>
						<Bot size={23} />
					</span>
					<div>
						<h2>{copy.title}</h2>
						<p>{copy.subtitle}</p>
					</div>
					<button className={styles.iconButton} aria-label={copy.close} title={copy.close} onClick={model.close}>
						<X size={20} />
					</button>
				</header>
				<nav className={styles.toolbar} aria-label={copy.title}>
					<button
						disabled={model.busy}
						onClick={() => {
							model.newChat();
							setHistory(false);
							input.current?.focus();
						}}
					>
						<MessageSquarePlus size={17} />
						{copy.newChat}
					</button>
					<button aria-expanded={history} onClick={() => setHistory((value) => !value)}>
						<Clock3 size={17} />
						{copy.history}
					</button>
				</nav>
				{history ? (
					<div className={styles.history}>
						{!model.conversations.length && <p className={styles.hint}>{copy.noHistory}</p>}
						{model.conversations.map((item) => (
							<div className={styles.historyItem} key={item.id}>
								<button
									disabled={model.busy}
									onClick={() => {
										void model.loadConversation(item.id);
										setHistory(false);
									}}
								>
									<strong>{item.title}</strong>
									<small>
										{new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(item.updated_at))}
									</small>
								</button>
								<button
									className={styles.iconButton}
									disabled={model.busy}
									aria-label={`${copy.deleteChat} : ${item.title}`}
									onClick={() => setDeleting(item.id)}
								>
									<Trash2 size={17} />
								</button>
							</div>
						))}
					</div>
				) : (
					<div ref={scroll} className={styles.messages} aria-live="polite" aria-relevant="additions">
						{!model.messages.length && !model.busy && (
							<div className={styles.welcome}>
								<span className={styles.botIcon}>
									<Bot size={28} />
								</span>
								<h3>{copy.emptyTitle}</h3>
								<p>{copy.emptyHint}</p>
								<div className={styles.suggestions}>
									{model.capabilities?.suggestions.map((question) => (
										<button
											key={question}
											onClick={() => {
												model.setDraft(question);
												input.current?.focus();
											}}
										>
											{question}
											<ArrowIcon />
										</button>
									))}
								</div>
							</div>
						)}
						{model.messages.map((message) => (
							<article
								key={message.id}
								className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
							>
								{message.text && <p className={styles.messageText}>{message.text}</p>}
								{message.cards.map((card, index) => (
									<ChatResults
										key={index}
										card={card}
										busy={model.busy}
										onNavigate={navigate}
										onConfirm={setConfirmation}
										onArchive={(resource, id) => void model.selectArchive(resource, id)}
									/>
								))}
								{message.role === 'assistant' && (
									<div className={styles.feedback}>
										<button
											aria-label={copy.helpful}
											title={copy.helpful}
											aria-pressed={feedback[message.id] === true}
											onClick={() => acknowledge(message.id, true)}
										>
											<ThumbsUp size={15} />
										</button>
										<button
											aria-label={copy.notHelpful}
											title={copy.notHelpful}
											aria-pressed={feedback[message.id] === false}
											onClick={() => acknowledge(message.id, false)}
										>
											<ThumbsDown size={15} />
										</button>
									</div>
								)}
							</article>
						))}
						{model.busy && (
							<div role="status" className={styles.pending}>
								{model.streamText ? (
									<p className={styles.messageText}>{model.streamText}</p>
								) : (
									<>
										<LoaderCircle size={17} className={styles.spinner} />
										{copy.thinking}
									</>
								)}
							</div>
						)}
					</div>
				)}
				<footer className={styles.footer}>
					{model.error && (
						<div role="alert" className={styles.error}>
							{model.error}
							{model.retry && !model.busy && (
								<button onClick={() => void model.send(model.retry!)}>{copy.retry}</button>
							)}
						</div>
					)}
					{model.capabilities?.shortcuts.length ? (
						<details className={styles.shortcuts}>
							<summary>{copy.shortcuts}</summary>
							<div>
								{model.capabilities.shortcuts.map((shortcut) => (
									<button
										key={shortcut.command}
										disabled={model.busy}
										title={shortcut.help}
										onClick={() => {
											model.setDraft(`${shortcut.command} `);
											input.current?.focus();
										}}
									>
										{shortcut.command}
										<span>{shortcut.title}</span>
									</button>
								))}
							</div>
						</details>
					) : null}
					<form
						className={styles.composer}
						onSubmit={(event) => {
							event.preventDefault();
							setHistory(false);
							void model.send();
						}}
					>
						<textarea
							ref={input}
							value={model.draft}
							aria-label={copy.placeholder}
							placeholder={copy.placeholder}
							maxLength={4000}
							rows={2}
							onChange={(event) => model.setDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
									event.preventDefault();
									setHistory(false);
									void model.send();
								}
							}}
						/>
						{model.busy ? (
							<button type="button" className={styles.send} aria-label={copy.stop} onClick={model.stop}>
								<Square size={17} />
							</button>
						) : (
							<button
								className={styles.send}
								aria-label={copy.send}
								disabled={!model.draft.trim() || !model.capabilities}
							>
								<Send size={18} />
							</button>
						)}
					</form>
					<p className={styles.privacy}>{copy.privacy}</p>
				</footer>
			</aside>
			{confirmation && (
				<ChatConfirmation
					card={confirmation}
					busy={model.busy}
					error={model.error}
					onClose={() => setConfirmation(null)}
					onConfirm={() => {
						void model.confirm(confirmation).then((saved) => {
							if (saved) setConfirmation(null);
						});
					}}
				/>
			)}
			{deleting && (
				<AiAssistantDialog
					title={copy.deleteChat}
					body={copy.deleteWarning}
					titleIcon={<Trash2 size={20} />}
					titleIconColor="#dc2626"
					onClose={() => {
						if (!model.busy) setDeleting(null);
					}}
					actions={[
						{ active: false, text: copy.cancel, disabled: model.busy, onClick: () => setDeleting(null) },
						{
							active: true,
							text: copy.delete,
							color: '#dc2626',
							disabled: model.busy,
							onClick: () => {
								void model.removeConversation(deleting).then((saved) => {
									if (saved) setDeleting(null);
								});
							},
						},
					]}
				>
					{model.error && (
						<p role="alert" className={styles.error}>
							{model.error}
						</p>
					)}
				</AiAssistantDialog>
			)}
		</>,
		document.body,
	);
};

const ArrowIcon = () => <span aria-hidden="true">↗</span>;

const AuthenticatedChatAssistant = () => {
	const isClient = useIsClient();
	const { data: session } = useSession();
	const profile = useAppSelector(getProfilState);
	const token = useAppSelector(getAccessToken) || session?.accessToken || '';
	return isClient && session && profile.id && token ? <EnabledChatAssistant key={profile.id} token={token} /> : null;
};

export default function ChatAssistant() {
	return process.env.NEXT_PUBLIC_CHAT_AI_ASSISTANT_ENABLED === 'true' ? <AuthenticatedChatAssistant /> : null;
}
