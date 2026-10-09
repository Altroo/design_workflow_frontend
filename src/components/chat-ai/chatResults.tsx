'use client';
import { Archive, ArrowUpRight, CalendarDays, CheckCircle2, FolderKanban, UserRound } from 'lucide-react';
import { useLanguage } from '@/utils/hooks';
import type { ChatCard, ChatConfirmation, ChatNavigation } from '@/types/chatAiTypes';
import styles from './chatAssistant.module.css';

export const ChatResults = ({
	card,
	busy,
	onNavigate,
	onConfirm,
	onArchive,
}: {
	card: ChatCard;
	busy: boolean;
	onNavigate: (target: ChatNavigation) => void;
	onConfirm: (card: ChatConfirmation) => void;
	onArchive: (resource: 'project' | 'task', id: number) => void;
}) => {
	const { t, language } = useLanguage();
	const copy = t.chatAi;
	const status = (key: string) => t.workflow.statuses[key as keyof typeof t.workflow.statuses] ?? key;
	const number = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value);
	if (card.type === 'knowledge') return null;
	if (card.type === 'record_list')
		return (
			<div className={styles.results}>
				{!card.items.length && <p className={styles.hint}>{copy.noResults}</p>}
				{card.items.map((item) => (
					<article key={item.id} className={styles.record}>
						<div className={styles.recordHeading}>
							<button className={styles.recordLink} onClick={() => onNavigate(item.navigation)}>
								{item.name}
								<ArrowUpRight size={16} />
							</button>
							{item.status && (
								<span className={styles.status} data-status={item.status}>
									{status(item.status)}
								</span>
							)}
						</div>
						{item.project && (
							<p className={styles.meta}>
								<FolderKanban size={14} />
								<span>{item.project}</span>
							</p>
						)}
						{item.description && <p className={styles.description}>{item.description}</p>}
						{item.assignee && (
							<p className={styles.meta}>
								<UserRound size={14} />
								<span>{item.assignee}</span>
							</p>
						)}
						{item.date && (
							<p className={styles.meta}>
								<CalendarDays size={14} />
								<span>
									{new Intl.DateTimeFormat(language).format(
										new Date(item.date.length === 10 ? `${item.date}T12:00:00` : item.date),
									)}
								</span>
							</p>
						)}
						<div className={styles.recordActions}>
							<button className="app-button app-button-secondary" onClick={() => onNavigate(item.navigation)}>
								<ArrowUpRight size={15} />
								{copy.openRecord}
							</button>
							{item.can_edit && card.resource !== 'message' ? (
								<button
									className={styles.textButton}
									disabled={busy}
									onClick={() => onArchive(card.resource as 'project' | 'task', item.id)}
								>
									<Archive size={15} />
									{copy.archive}
								</button>
							) : (
								card.resource !== 'message' && <span className={styles.hint}>{copy.readOnly}</span>
							)}
						</div>
					</article>
				))}
				{card.has_more && <p className={styles.hint}>{copy.moreResults}</p>}
			</div>
		);
	if (card.type === 'navigation')
		return (
			<button className="app-button app-button-secondary" onClick={() => onNavigate(card.target)}>
				<ArrowUpRight size={16} />
				{copy.openRecord}
			</button>
		);
	if (card.type === 'confirmation')
		return (
			<div className={styles.record}>
				<strong>{card.label}</strong>
				<p className={styles.hint}>{card.operation === 'archive' ? copy.archiveTitle : copy.confirmTitle}</p>
				<button disabled={busy} className="app-button" onClick={() => onConfirm(card)}>
					{card.operation === 'archive' ? copy.archive : copy.confirm}
				</button>
			</div>
		);
	if (card.type === 'confirmation_status')
		return (
			<p className={styles.success}>
				<CheckCircle2 size={17} />
				{card.status === 'completed' ? copy.done : copy.expired}
			</p>
		);
	if (card.type === 'workload_summary')
		return (
			<section className={styles.record}>
				<strong>{copy.workload}</strong>
				<p className={styles.hint}>{card.project || (card.mine ? copy.myTasks : copy.allProjects)}</p>
				<dl className={styles.counts}>
					{['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'].map((key) => (
						<div key={key}>
							<dt>
								<span className={styles.status} data-status={key}>
									{status(key)}
								</span>
							</dt>
							<dd>{number(card.counts[key] ?? 0)}</dd>
						</div>
					))}
				</dl>
			</section>
		);
	if (card.type === 'time_report')
		return (
			<section className={styles.record}>
				<strong>{copy.workingTime}</strong>
				<p className={styles.hint}>{card.project || copy.allProjects}</p>
				<p className={styles.timeValue}>
					{number(card.minutes / 480)} <span>{copy.workdays}</span>
				</p>
				<p>
					{number(card.minutes / 60)} {copy.hours}
				</p>
				<p className={styles.hint}>
					{card.date_from && card.date_to
						? `${copy.from} ${new Intl.DateTimeFormat(language).format(new Date(`${card.date_from}T12:00:00`))} ${copy.to} ${new Intl.DateTimeFormat(language).format(new Date(`${card.date_to}T12:00:00`))}`
						: copy.allTime}
				</p>
				<p className={styles.hint}>{copy.timeBasis}</p>
				<button className="app-button app-button-secondary" onClick={() => onNavigate(card.navigation)}>
					<ArrowUpRight size={16} />
					{t.navigation.reports}
				</button>
			</section>
		);
	return null;
};
