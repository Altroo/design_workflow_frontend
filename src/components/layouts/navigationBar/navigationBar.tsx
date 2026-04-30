'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import FlagGB from '../../../../public/assets/images/flags/gb.svg';
import FlagFR from '../../../../public/assets/images/flags/fr.svg';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
	Bell,
	BriefcaseBusiness,
	ChevronDown,
	CircleUserRound,
	FolderKanban,
	KeyRound,
	LayoutDashboard,
	ListTodo,
	LogOut,
	MessagesSquare,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Shield,
	Users,
} from 'lucide-react';
import {
	AUTH_LOGIN,
	BACKEND_SITE_ADMIN,
	DASHBOARD_BOARD,
	DASHBOARD_CHAT,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_MY_WORK,
	DASHBOARD_NOTIFICATIONS,
	DASHBOARD_OVERVIEW,
	DASHBOARD_PASSWORD,
	DASHBOARD_PROJECTS,
	DASHBOARD_PROJECT_VIEW,
	DASHBOARD_REPORTS_TIME,
	DASHBOARD_TEAM,
	DASHBOARD_TASK_VIEW,
	SITE_ROOT,
	USERS_ADD,
	USERS_LIST,
} from '@/utils/routes';
import { cookiesDeleter } from '@/utils/apiHelpers';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '@/store/services/designWorkflow';
import type { NotificationItem } from '@/types/designWorkflowTypes';

type Props = {
	title: string;
	children: React.ReactNode;
	hideTopbar?: boolean;
};

type NavItem = {
	label: string;
	path: string;
	icon: React.ReactNode;
	badge?: number;
};

const normalizePath = (url: string) => {
	try {
		return new URL(url, SITE_ROOT).pathname;
	} catch {
		return url;
	}
};

const NavigationBar = ({ title, children, hideTopbar = false }: Props) => {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session } = useSession();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [railOpen, setRailOpen] = useState(true);
	const [isMobile, setIsMobile] = useState(false);
	const { t, language, setLanguage } = useLanguage();
	const profile = useAppSelector(getProfilState);
	const notificationsRef = useRef<HTMLDivElement | null>(null);
	const profileMenuRef = useRef<HTMLDivElement | null>(null);
	const seenUnreadIdsRef = useRef<number[]>([]);
	const isSuperuser = Boolean((profile as { is_superuser?: boolean }).is_superuser);
	const hasWorkflowDataAccess = Boolean(session && (profile.role || profile.is_staff || isSuperuser));
	const unreadNotificationsQuery = useGetNotificationsQuery(
		{ unread: true },
		{ skip: !hasWorkflowDataAccess },
	);
	const unreadNotifications = unreadNotificationsQuery.data?.length ?? 0;
	const notificationsPreviewQuery = useGetNotificationsQuery(undefined, {
		skip: !hasWorkflowDataAccess,
	});
	const [markNotificationRead] = useMarkNotificationReadMutation();
	const notificationsPreview = notificationsPreviewQuery.data?.slice(0, 5) ?? [];
	const hasManagerAccess = profile.role === 'manager' || profile.is_staff || isSuperuser;
	const labelForNotificationType = (type: string) => t.workflow.activities[type] ?? type.replaceAll('_', ' ');
	const notificationEntity = (notification: NotificationItem) => {
		if (notification.task) {
			return {
				label: t.workflow.labels.notificationTask ?? 'Task',
				name: notification.task.title,
				context: notification.task.project.name,
				href: DASHBOARD_TASK_VIEW(notification.task.id),
				icon: <ListTodo size={16} />,
				tone: 'bg-violet-50 text-violet-700 border-violet-100',
			};
		}
		if (notification.project) {
			return {
				label: t.workflow.labels.notificationProject ?? 'Project',
				name: notification.project.name,
				context: notification.project.manager ? `${notification.project.manager.first_name} ${notification.project.manager.last_name}`.trim() : '',
				href: DASHBOARD_PROJECT_VIEW(notification.project.id),
				icon: <FolderKanban size={16} />,
				tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
			};
		}
		if (notification.type === 'chat_message') {
			const sender = typeof notification.payload.title === 'string' ? notification.payload.title : '';
			return {
				label: t.workflow.labels.notificationChat ?? 'Chat',
				name: sender || labelForNotificationType(notification.type),
				context: '',
				href: DASHBOARD_CHAT,
				icon: <MessagesSquare size={16} />,
				tone: 'bg-cyan-50 text-cyan-700 border-cyan-100',
			};
		}
		return {
			label: t.workflow.labels.notificationWorkflow ?? 'Workflow',
			name: labelForNotificationType(notification.type),
			context: '',
			href: DASHBOARD_NOTIFICATIONS,
			icon: <Bell size={16} />,
			tone: 'bg-slate-50 text-slate-700 border-slate-100',
		};
	};
	const notificationDetail = (notification: NotificationItem) => {
		if (notification.type === 'task_overdue' && typeof notification.payload.days_overdue === 'number') {
			return `${notification.payload.days_overdue} ${t.workflow.labels.daysOverdue ?? 'days overdue'}`;
		}
		if (notification.type === 'task_status' && typeof notification.payload.status === 'string') {
			return `${t.workflow.labels.statusLabel ?? 'Status'}: ${t.workflow.statuses[notification.payload.status] ?? notification.payload.status}`;
		}
		if (notification.type === 'task_reassigned' && typeof notification.payload.reason === 'string' && notification.payload.reason.trim()) {
			return notification.payload.reason;
		}
		if (notification.type === 'chat_message' && typeof notification.payload.title === 'string') {
			return notification.payload.title;
		}
		return '';
	};

	useEffect(() => {
		const syncViewport = () => setIsMobile(window.innerWidth <= 1023);
		syncViewport();
		window.addEventListener('resize', syncViewport);
		return () => window.removeEventListener('resize', syncViewport);
	}, []);

	useEffect(() => {
		if (!notificationsOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
				setNotificationsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [notificationsOpen]);

	useEffect(() => {
		if (!profileMenuOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
				setProfileMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [profileMenuOpen]);

	useEffect(() => {
		if (typeof window === 'undefined' || !('Notification' in window)) return;
		const unread = (unreadNotificationsQuery.data ?? []).filter((notification) => !notification.is_read);
		const unreadIds = unread.map((notification) => notification.id);
		const newNotifications = unread.filter((notification) => !seenUnreadIdsRef.current.includes(notification.id));
		seenUnreadIdsRef.current = unreadIds;
		if (Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
		newNotifications.slice(0, 2).forEach((notification) => {
			const title = t.workflow.activities[notification.type] ?? (t.workflow.labels.notificationFallback ?? 'Workflow notification');
			const body = notification.task?.title ?? notification.project?.name ?? (typeof notification.payload.title === 'string' ? notification.payload.title : notification.type);
			new Notification(title, { body });
		});
	}, [t.workflow.activities, t.workflow.labels.notificationFallback, unreadNotificationsQuery.data]);

	const workflowItems = useMemo<NavItem[]>(
		() =>
			hasManagerAccess
				? [
						{ label: t.navigation.overview, path: DASHBOARD_OVERVIEW, icon: <LayoutDashboard size={16} /> },
						{ label: t.navigation.board, path: DASHBOARD_BOARD, icon: <BriefcaseBusiness size={16} /> },
						{ label: t.navigation.projects, path: DASHBOARD_PROJECTS, icon: <FolderKanban size={16} /> },
						{ label: t.navigation.team, path: DASHBOARD_TEAM, icon: <Users size={16} /> },
						{ label: t.workflow.labels.chatTitle ?? 'Chat', path: DASHBOARD_CHAT, icon: <MessagesSquare size={16} /> },
						{ label: t.navigation.reports, path: DASHBOARD_REPORTS_TIME, icon: <Shield size={16} /> },
						{
							label: t.navigation.notifications,
							path: DASHBOARD_NOTIFICATIONS,
							icon: <Bell size={16} />,
							badge: unreadNotifications,
						},
					]
				: [
						{ label: t.navigation.myWork, path: DASHBOARD_MY_WORK, icon: <LayoutDashboard size={16} /> },
						{ label: t.navigation.board, path: DASHBOARD_BOARD, icon: <BriefcaseBusiness size={16} /> },
						{ label: t.navigation.projects, path: DASHBOARD_PROJECTS, icon: <FolderKanban size={16} /> },
						{ label: t.workflow.labels.chatTitle ?? 'Chat', path: DASHBOARD_CHAT, icon: <MessagesSquare size={16} /> },
						{
							label: t.navigation.notifications,
							path: DASHBOARD_NOTIFICATIONS,
							icon: <Bell size={16} />,
							badge: unreadNotifications,
						},
					],
		[hasManagerAccess, t, unreadNotifications],
	);

	const utilityItems = useMemo<NavItem[]>(
		() => [
			...(profile.is_staff || isSuperuser
				? [
						{ label: t.navigation.usersList, path: USERS_LIST, icon: <Users size={16} /> },
						{ label: t.navigation.newUser, path: USERS_ADD, icon: <Users size={16} /> },
					]
				: []),
			{ label: t.navigation.myProfile, path: DASHBOARD_EDIT_PROFILE, icon: <CircleUserRound size={16} /> },
			{ label: t.navigation.changePassword, path: DASHBOARD_PASSWORD, icon: <KeyRound size={16} /> },
		],
		[isSuperuser, profile.is_staff, t],
	);
	const profileMenuItems = useMemo<NavItem[]>(
		() => [
			{ label: t.navigation.myProfile, path: DASHBOARD_EDIT_PROFILE, icon: <CircleUserRound size={16} /> },
			{ label: t.navigation.changePassword, path: DASHBOARD_PASSWORD, icon: <KeyRound size={16} /> },
		],
		[t],
	);

	const greeting =
		profile.gender === 'Femme'
			? t.navigation.welcomeFemale
			: profile.gender === 'Homme'
				? t.navigation.welcomeMale
				: t.navigation.welcomeNeutral;

	const logOutHandler = async () => {
		await cookiesDeleter('/api/cookies', {
			pass_updated: true,
			new_email: true,
			code: true,
		});
		await signOut({ redirect: true, redirectTo: AUTH_LOGIN });
	};

	const handleNotificationPreviewClick = async (
		event: React.MouseEvent<HTMLAnchorElement>,
		notification: NotificationItem,
		href: string,
	) => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
		event.preventDefault();
		setNotificationsOpen(false);
		if (!notification.is_read) {
			try {
				await markNotificationRead(notification.id).unwrap();
			} catch {
				// Navigation still matters more than a transient read-state failure.
			}
		}
		router.push(href);
	};

	const renderNavLink = (item: NavItem) => {
		const active = normalizePath(item.path) === pathname;
		return (
			<Link
				key={item.path}
				href={item.path}
				title={item.label}
				onClick={() => setMobileMenuOpen(false)}
				className={[
					'app-pill workflow-focus-ring workflow-nav-link',
					'flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold transition',
					active
						? 'border-[color:var(--accent)] bg-(--accent-soft) text-(--accent-strong) shadow-(--shadow-sm)'
						: 'text-(--ink-soft) hover:border-[color:var(--line-strong)] hover:bg-(--surface-muted) hover:text-(--ink)',
				].join(' ')}
			>
				<span className={active ? 'text-(--accent-strong)' : 'text-(--ink-soft)'}>{item.icon}</span>
				<span className="workflow-nav-text min-w-0 flex-1 truncate">{item.label}</span>
				{item.badge ? (
					<span
						className={[
							'workflow-nav-badge inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
							active ? 'bg-(--accent-strong) text-white' : 'bg-(--ink) text-white',
						].join(' ')}
					>
						{item.badge}
					</span>
				) : null}
			</Link>
		);
	};

	const profileAvatar = (
		<div className="workflow-topbar-avatar relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-(--surface-strong)">
			{profile.avatar_cropped ? (
				<Image
					src={profile.avatar_cropped as string}
					alt={`${profile.first_name} ${profile.last_name}`}
					fill
					sizes="40px"
					className="object-cover"
				/>
			) : (
				<span className="workflow-avatar-initials inline-flex h-full w-full items-center justify-center text-center text-sm font-black leading-none text-(--ink)">
					{(profile.first_name?.[0] ?? 'D').toUpperCase()}
					{(profile.last_name?.[0] ?? 'W').toUpperCase()}
				</span>
			)}
		</div>
	);

	return (
		<div className={['workflow-shell', railOpen ? 'workflow-shell-expanded' : ''].join(' ')}>
			<aside className={['workflow-rail app-card hidden flex-col bg-white p-3 lg:flex', railOpen ? 'workflow-rail-expanded' : 'items-center'].join(' ')}>
				<div className="flex w-full items-center justify-between gap-3 border-b border-[color:var(--line)] pb-4">
					<div className="workflow-rail-logo flex h-11 w-11 items-center justify-center rounded-lg bg-(--accent) text-center text-sm font-semibold leading-none text-white shadow-(--shadow-sm)">
						DW
					</div>
					<div className="workflow-rail-title min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--ink-muted)">Design Workflow</p>
						<p className="truncate text-base font-semibold text-(--ink)">{title}</p>
					</div>
					<button
						type="button"
						aria-label={railOpen ? 'Collapse navigation' : 'Expand navigation'}
						onClick={() => setRailOpen((current) => !current)}
						className="app-pill workflow-focus-ring flex h-10 w-10 shrink-0 items-center justify-center text-(--ink)"
					>
						{railOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
					</button>
				</div>

				<nav aria-label="Workflow navigation" className={['mt-5 flex flex-1 flex-col gap-2', railOpen ? 'w-full items-stretch' : 'items-center'].join(' ')}>
					<p className="workflow-nav-section px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-(--accent-strong)">Workspace</p>
					{workflowItems.map(renderNavLink)}
					<div className="mt-5 w-full border-t border-[color:var(--line)] pt-4">
						<p className="workflow-nav-section mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--ink-muted)">
							{profile.is_staff ? t.navigation.users : t.navigation.settings}
						</p>
						<div className="flex flex-col items-center gap-2">{utilityItems.map(renderNavLink)}</div>
					</div>
				</nav>

				<div className="workflow-rail-user mt-5 rounded-lg border border-[color:var(--line)] bg-(--accent-tint) p-3">
					<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--ink-muted)">Signed in</p>
					<p className="mt-1 truncate text-sm font-semibold text-(--ink)">
						{profile.first_name} {profile.last_name}
					</p>
					<p className="mt-1 text-xs text-(--ink-soft)">{profile.role || (profile.is_staff ? 'admin' : 'designer')}</p>
				</div>
			</aside>

			<div className="workflow-main">
				<div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4">
					{hideTopbar ? null : (
					<header className="workflow-topbar workflow-commandbar app-card overflow-visible bg-white px-3 py-3 sm:px-4">
						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								aria-label={t.accessibility.toggleDrawer}
								onClick={() => setMobileMenuOpen((current) => !current)}
								className={[
									'app-pill workflow-focus-ring flex h-10 w-10 items-center justify-center text-(--ink) lg:hidden',
									isMobile ? 'inline-flex' : 'hidden',
								].join(' ')}
							>
								<Menu size={18} />
							</button>

							<div className="app-pill flex items-center gap-3 px-3 py-2 lg:hidden">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--accent) text-sm font-semibold text-white">
									DW
								</div>
								<div className="hidden sm:block">
									<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--ink-muted)">
										Design Workflow
									</p>
									<p className="text-sm font-semibold text-(--ink)">{title}</p>
								</div>
							</div>

							<div className="workflow-topbar-controls ml-auto flex items-center gap-2">
								<div ref={notificationsRef} className="relative">
									<button type="button" onClick={() => setNotificationsOpen((current) => !current)} className="workflow-topbar-icon workflow-focus-ring relative flex h-10 w-10 items-center justify-center text-(--ink)">
										<Bell size={18} />
										{unreadNotifications ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-600" /> : null}
									</button>
									{notificationsOpen ? (
										<div className="workflow-topbar-menu absolute right-0 top-[calc(100%+10px)] z-[110] flex w-[360px] max-w-[calc(100vw-24px)] flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-white p-3 shadow-(--shadow-lg)">
											<div className="flex items-center justify-between gap-3 px-1">
												<p className="text-sm font-bold text-(--ink)">{t.navigation.notifications}</p>
												<Link href={DASHBOARD_NOTIFICATIONS} onClick={() => setNotificationsOpen(false)} className="text-xs font-semibold text-(--accent-strong)">{t.navigation.openInbox ?? 'Open inbox'}</Link>
											</div>
											<div className="space-y-2">
												{notificationsPreview.map((notification) => {
													const entity = notificationEntity(notification);
													const detail = notificationDetail(notification);
													return (
														<Link
															key={notification.id}
															href={entity.href}
															onClick={(event) => handleNotificationPreviewClick(event, notification, entity.href)}
															data-unread={!notification.is_read}
															className="workflow-notification-preview-card group block rounded-xl border px-3 py-3 transition"
														>
															<div className="flex items-start gap-3">
																<span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border ${entity.tone}`}>
																	{entity.icon}
																</span>
																<div className="min-w-0 flex-1">
																	<div className="mb-1 flex items-center gap-2">
																		<span className="rounded-full bg-(--surface-muted) px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-(--ink-muted)">
																			{entity.label}
																		</span>
																		{notification.is_read ? null : <span className="h-2 w-2 rounded-full bg-red-600" />}
																	</div>
																	<p className="text-sm font-bold leading-snug text-(--ink)">{labelForNotificationType(notification.type)}</p>
																	<p className="mt-1 truncate text-xs font-semibold text-(--ink-soft)">{entity.name}</p>
																	{detail || entity.context ? (
																		<p className="mt-1 truncate text-[11px] text-(--ink-muted)">{detail || entity.context}</p>
																	) : null}
																</div>
															</div>
														</Link>
													);
												})}
												{notificationsPreview.length === 0 ? <p className="px-1 py-4 text-sm text-(--ink-soft)">{t.navigation.noNotificationsYet ?? 'No notifications yet.'}</p> : null}
											</div>
										</div>
									) : null}
								</div>
								{(profile.is_staff || isSuperuser) && (
									<a
										href={BACKEND_SITE_ADMIN}
										target="_blank"
										rel="noopener noreferrer"
										className="workflow-topbar-control workflow-focus-ring hidden items-center gap-2 px-3 py-2 text-sm font-bold text-(--ink) transition xl:inline-flex"
									>
										<Shield size={16} />
										<span>{t.navigation.administration}</span>
									</a>
								)}
								<button
									type="button"
									onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
									className="workflow-topbar-control workflow-focus-ring hidden items-center gap-2 px-3 py-2 text-sm font-bold text-(--ink) transition sm:inline-flex"
								>
									<Image
										src={language === 'fr' ? FlagGB : FlagFR}
										alt=""
										width={30}
										height={20}
										className="workflow-language-flag"
										aria-hidden="true"
									/>
									<span>{language === 'fr' ? 'EN' : 'FR'}</span>
								</button>

								<div ref={profileMenuRef} className="relative">
									<button
										type="button"
										onClick={() => setProfileMenuOpen((current) => !current)}
										className="workflow-topbar-profile workflow-focus-ring flex items-center gap-3 px-3 py-2 text-left"
									>
										{profileAvatar}
										<div className="hidden sm:block">
											<p className="text-xs font-medium text-(--ink-soft)">{greeting}</p>
											<p className="text-sm font-semibold text-(--ink)">
												{profile.first_name} {profile.last_name}
											</p>
										</div>
										<ChevronDown size={16} className="text-(--ink-soft)" />
									</button>

									{profileMenuOpen ? (
										<div className="workflow-topbar-menu absolute right-0 top-[calc(100%+10px)] z-[100] flex min-w-[270px] flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-white p-3 shadow-(--shadow-lg)">
											<div className="flex flex-col gap-2">{profileMenuItems.map(renderNavLink)}</div>
											<button
												type="button"
												onClick={() => {
													setProfileMenuOpen(false);
													void logOutHandler();
												}}
												className="app-button app-button-secondary w-full justify-center"
											>
												<LogOut size={16} />
												<span>{t.navigation.logout}</span>
											</button>
										</div>
									) : null}
								</div>
							</div>
						</div>

						{isMobile && mobileMenuOpen ? (
							<div className="mt-3 flex flex-col gap-2 rounded-lg border border-[color:var(--line)] bg-(--surface-muted) p-3 lg:hidden">
								{workflowItems.map(renderNavLink)}
								<div className="rounded-lg border border-dashed border-[color:var(--line)] p-3">
									<p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--ink-muted)">
										{profile.is_staff || isSuperuser ? t.navigation.users : t.navigation.settings}
									</p>
									<div className="flex flex-col gap-2">{utilityItems.map(renderNavLink)}</div>
								</div>
							</div>
						) : null}
					</header>
					)}

					<main className="min-w-0 pb-6">{children}</main>
				</div>
			</div>
		</div>
	);
};

export default NavigationBar;
