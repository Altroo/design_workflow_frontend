'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const WORKFLOW_AVATAR_SIZES = {
	compact: 30,
	default: 34,
	team: 42,
} as const;

type WorkflowAvatarUser = {
	first_name?: string | null;
	last_name?: string | null;
	email?: string | null;
	avatar?: string | null;
};

type WorkflowAvatarProps = {
	user?: WorkflowAvatarUser | null;
	size?: number;
	online?: boolean;
	showPresence?: boolean;
	avatarClassName?: string;
	presenceClassName?: string;
	presenceDotClassName?: string;
	className?: string;
	label?: string;
	fallbackInitials?: string;
};

const resolveMediaUrl = (value?: string | null) => {
	if (!value) return '';
	if (/^https?:\/\//.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
	return `${API_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const labelFor = (user?: WorkflowAvatarUser | null, fallback = 'System') =>
	user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email || fallback : fallback;

const initialsFor = (user?: WorkflowAvatarUser | null, fallback = 'U') =>
	user
		? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? user.email?.[0] ?? ''}`.trim().toUpperCase() || fallback
		: fallback;

export const WorkflowAvatar = ({
	user,
	size = WORKFLOW_AVATAR_SIZES.default,
	online = false,
	showPresence = false,
	avatarClassName,
	presenceClassName,
	presenceDotClassName,
	className,
	label,
	fallbackInitials = 'U',
}: WorkflowAvatarProps) => {
	const avatarUrl = resolveMediaUrl(user?.avatar);
	const avatarLabel = label ?? labelFor(user);
	const avatarStyle: CSSProperties = { width: size, height: size };
	const avatar = avatarUrl ? (
		<span className={cx('relative block overflow-hidden rounded-full', avatarClassName)} style={avatarStyle}>
			<Image src={avatarUrl} alt={avatarLabel} fill sizes={`${size}px`} unoptimized className="object-cover" />
		</span>
	) : (
		<span
			className={cx('workflow-avatar-initials inline-flex items-center justify-center rounded-full bg-(--surface-strong) text-center text-xs font-bold leading-none text-(--ink)', avatarClassName)}
			style={avatarStyle}
		>
			{initialsFor(user, fallbackInitials)}
		</span>
	);

	if (!showPresence) return avatar;

	return (
		<span
			className={cx('workflow-avatar-presence', presenceClassName, className)}
			data-online={online}
			aria-label={`${avatarLabel} ${online ? 'online' : 'offline'}`}
			style={avatarStyle}
		>
			{avatar}
			{user ? <span className={cx('workflow-avatar-presence-dot', presenceDotClassName)} aria-hidden="true" /> : null}
		</span>
	);
};
