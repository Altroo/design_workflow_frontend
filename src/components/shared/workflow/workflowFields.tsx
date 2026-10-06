'use client';

import { cn } from '@/utils/workflow/workflowFormatting';
import { AvatarTooltip } from '@/components/shared/workflow/avatarTooltip';
import { WORKFLOW_AVATAR_SIZES, WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';
import { getWSOnlineUserIdsState } from '@/store/selectors';
import type { ProjectSummary, TaskStatus, WorkflowUser } from '@/types/designWorkflowTypes';
import { useAppSelector } from '@/utils/hooks';
import { WORK_DAY_MINUTES } from '@/utils/rawData';
import { CalendarDays, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

export const AvatarBadge = ({
	user,
	size = WORKFLOW_AVATAR_SIZES.default,
	showPresence = true,
	showTooltip = false,
}: {
	user?: WorkflowUser | null;
	size?: number;
	showPresence?: boolean;
	showTooltip?: boolean;
}) => {
	const onlineUserIds = useAppSelector(getWSOnlineUserIdsState);
	const online = !!user && onlineUserIds.includes(user.id);
	const avatar = (
		<WorkflowAvatar
			user={user}
			size={size}
			online={online}
			showPresence={!!user && showPresence}
			fallbackInitials="S"
		/>
	);
	return showTooltip && user ? (
		<AvatarTooltip name={`${user.first_name} ${user.last_name}`.trim() || user.email}>{avatar}</AvatarTooltip>
	) : (
		avatar
	);
};

export const HistoryPager = ({
	page,
	totalPages,
	onChangeAction,
}: {
	page: number;
	totalPages: number;
	onChangeAction: (page: number) => void;
}) =>
	totalPages > 1 ? (
		<div className="mt-4 flex items-center justify-between gap-3">
			<button
				type="button"
				className="app-button app-button-secondary px-4 py-2"
				disabled={page <= 1}
				onClick={() => onChangeAction(Math.max(1, page - 1))}
			>
				<ChevronLeft size={16} />
			</button>
			<span className="text-sm font-semibold text-(--ink-soft)">
				{page}/{totalPages}
			</span>
			<button
				type="button"
				className="app-button app-button-secondary px-4 py-2"
				disabled={page >= totalPages}
				onClick={() => onChangeAction(Math.min(totalPages, page + 1))}
			>
				<ChevronRight size={16} />
			</button>
		</div>
	) : null;

export const Surface = ({
	title,
	description,
	action,
	children,
	className,
}: {
	title?: string;
	description?: string;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) => (
	<section className={cn('app-card overflow-hidden bg-white p-4 sm:p-5', className)}>
		{title || description || action ? (
			<div className="mb-4 flex flex-col gap-3 border-b border-(--line) pb-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					{title ? <h2 className="text-xl font-semibold text-(--ink)">{title}</h2> : null}
					{description ? <p className="mt-1 text-sm leading-6 text-(--ink-soft)">{description}</p> : null}
				</div>
				{action ? <div className="shrink-0">{action}</div> : null}
			</div>
		) : null}
		{children}
	</section>
);

export const FieldLabel = ({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) => (
	<label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-(--ink-soft)">
		{children}
	</label>
);

export const Field = ({
	id,
	value,
	onChangeAction,
	type = 'text',
	placeholder,
	min,
	startIcon,
}: {
	id?: string;
	value: string | number;
	onChangeAction: (value: string) => void;
	type?: string;
	placeholder?: string;
	min?: number;
	startIcon?: ReactNode;
}) => (
	<div className="relative">
		{startIcon ? (
			<span className="pointer-events-none absolute left-3 top-0 z-10 flex h-full items-center justify-center text-(--ink-soft)">
				{startIcon}
			</span>
		) : null}
		<input
			id={id}
			type={type}
			min={min}
			value={value}
			onChange={(event) => onChangeAction(event.target.value)}
			placeholder={placeholder}
			className={cn('app-input', startIcon ? 'pl-14' : '')}
		/>
	</div>
);

export const mentionTokenForUser = (user: WorkflowUser) => {
	const fullName = `${user.first_name}.${user.last_name}`
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9._-]+/g, '.');
	return fullName.replace(/^\.+|\.+$/g, '') || user.email.split('@')[0];
};

export const Area = ({
	id,
	value,
	onChangeAction,
	rows = 4,
	placeholder,
	startIcon,
	mentionUsers,
}: {
	id?: string;
	value: string;
	onChangeAction: (value: string) => void;
	rows?: number;
	placeholder?: string;
	startIcon?: ReactNode;
	mentionUsers?: WorkflowUser[];
}) => {
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const [mentionMatch, setMentionMatch] = useState<{ start: number; end: number; query: string } | null>(null);
	const [activeMentionIndex, setActiveMentionIndex] = useState(0);
	const suggestions = mentionMatch
		? (mentionUsers ?? [])
				.filter((user) => {
					const needle = mentionMatch.query.toLowerCase();
					const haystack =
						`${user.first_name} ${user.last_name} ${user.email} ${mentionTokenForUser(user)}`.toLowerCase();
					return !needle || haystack.includes(needle);
				})
				.slice(0, 5)
		: [];

	const refreshMention = (nextValue: string, caret: number | null) => {
		if (!mentionUsers?.length || caret === null) {
			setMentionMatch(null);
			return;
		}
		const match = nextValue.slice(0, caret).match(/(?:^|\s)@([\p{L}\p{N}._-]*)$/u);
		if (!match) {
			setMentionMatch(null);
			return;
		}
		const tokenLength = match[1].length + 1;
		setMentionMatch({ start: caret - tokenLength, end: caret, query: match[1] });
		setActiveMentionIndex(0);
	};

	const chooseMention = (user: WorkflowUser) => {
		if (!mentionMatch) return;
		const token = `@${mentionTokenForUser(user)} `;
		const nextValue = `${value.slice(0, mentionMatch.start)}${token}${value.slice(mentionMatch.end)}`;
		const nextCaret = mentionMatch.start + token.length;
		onChangeAction(nextValue);
		setMentionMatch(null);
		window.requestAnimationFrame(() => {
			inputRef.current?.focus();
			inputRef.current?.setSelectionRange(nextCaret, nextCaret);
		});
	};

	return (
		<div className="relative">
			{startIcon ? (
				<span className="pointer-events-none absolute left-3 top-5 z-10 text-(--ink-soft)">{startIcon}</span>
			) : null}
			<textarea
				ref={inputRef}
				id={id}
				rows={rows}
				value={value}
				onChange={(event) => {
					onChangeAction(event.target.value);
					refreshMention(event.target.value, event.target.selectionStart);
				}}
				onClick={(event) => refreshMention(event.currentTarget.value, event.currentTarget.selectionStart)}
				onKeyDown={(event) => {
					if (!mentionMatch || suggestions.length === 0) return;
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						setActiveMentionIndex((current) =>
							event.key === 'ArrowDown'
								? (current + 1) % suggestions.length
								: (current - 1 + suggestions.length) % suggestions.length,
						);
					}
					if (event.key === 'Enter' || event.key === 'Tab') {
						event.preventDefault();
						chooseMention(suggestions[activeMentionIndex] ?? suggestions[0]);
					}
					if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						setMentionMatch(null);
					}
				}}
				placeholder={placeholder}
				className={cn('app-input min-h-27.5 resize-y', startIcon ? 'pl-14' : '')}
			/>
			{mentionMatch && suggestions.length > 0 ? (
				<div className="workflow-mention-menu" role="listbox">
					{suggestions.map((user, index) => (
						<button
							key={user.id}
							type="button"
							role="option"
							aria-selected={index === activeMentionIndex}
							data-active={index === activeMentionIndex}
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => chooseMention(user)}
						>
							<AvatarBadge user={user} size={30} showPresence={false} />
							<span>
								<b>
									{user.first_name} {user.last_name}
								</b>
								<small>@{mentionTokenForUser(user)}</small>
							</span>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
};

export const DeferredHexColorPicker = ({
	value,
	onCommitAction,
}: {
	value: string;
	onCommitAction: (value: string) => void;
}) => {
	const [draft, setDraft] = useState(value);
	const draftRef = useRef(value);

	const commit = () => {
		if (draftRef.current !== value) onCommitAction(draftRef.current);
	};

	return (
		<div className="workflow-deferred-color-picker" onPointerUp={commit} onBlur={commit}>
			<HexColorPicker
				color={draft}
				onChange={(nextValue) => {
					draftRef.current = nextValue;
					setDraft(nextValue);
				}}
			/>
		</div>
	);
};

export const WorkDaysField = ({
	id,
	value,
	onChangeAction,
	min = 1,
}: {
	id?: string;
	value: string;
	onChangeAction: (value: string) => void;
	min?: number;
}) => {
	const numericValue = Number(value || 0);
	const displayValue = numericValue ? String(Math.max(min, Math.round(numericValue / WORK_DAY_MINUTES))) : '';

	return (
		<div className="workflow-work-days-field">
			<Field
				id={id}
				type="number"
				min={min}
				value={displayValue}
				onChangeAction={(nextValue) => {
					if (nextValue === '') {
						onChangeAction('');
						return;
					}
					onChangeAction(String(Math.max(min, Math.round(Number(nextValue))) * WORK_DAY_MINUTES));
				}}
				startIcon={<CalendarDays size={18} />}
			/>
		</div>
	);
};

export const ToggleField = ({
	label,
	checked,
	onChangeAction,
}: {
	label: string;
	checked: boolean;
	onChangeAction: (checked: boolean) => void;
}) => (
	<label className="inline-flex items-center gap-3 text-sm font-medium text-(--ink-soft)">
		<input
			type="checkbox"
			checked={checked}
			onChange={(event) => onChangeAction(event.target.checked)}
			className="app-check"
			suppressHydrationWarning
		/>
		<span>{label}</span>
	</label>
);

export const EmptyState = ({
	title,
	description,
	icon,
	action,
}: {
	title: string;
	description: string;
	icon?: ReactNode;
	action?: ReactNode;
}) => (
	<div className="workflow-empty-state rounded-2xl border border-(--line) bg-white px-5 py-6 text-center">
		<span className="workflow-empty-state-icon" aria-hidden="true">
			{icon ?? <FileText size={18} />}
		</span>
		<div className="workflow-empty-state-copy">
			<p className="text-base font-semibold text-(--ink)">{title}</p>
			<p className="mt-2 text-sm leading-6 text-(--ink-soft)">{description}</p>
		</div>
		{action ? <div className="workflow-empty-state-action">{action}</div> : null}
	</div>
);

export const Chip = ({
	children,
	tone,
	status,
}: {
	children: ReactNode;
	tone?: 'urgent' | 'progress' | 'neutral' | 'warning';
	status?: TaskStatus | ProjectSummary['status'];
}) => (
	<span className="workflow-chip" data-tone={tone} data-status={status}>
		{children}
	</span>
);
