'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
	Bell,
	BriefcaseBusiness,
	ChevronDown,
	CircleUserRound,
	Command,
	FolderKanban,
	KeyRound,
	LayoutDashboard,
	LogOut,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Search,
	Shield,
	Users,
} from 'lucide-react';
import {
	AUTH_LOGIN,
	BACKEND_SITE_ADMIN,
	DASHBOARD_BOARD,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_MY_WORK,
	DASHBOARD_NOTIFICATIONS,
	DASHBOARD_OVERVIEW,
	DASHBOARD_PASSWORD,
	DASHBOARD_PROJECTS,
	DASHBOARD_REPORTS_TIME,
	DASHBOARD_TEAM,
	SITE_ROOT,
	USERS_ADD,
	USERS_LIST,
} from '@/utils/routes';
import { cookiesDeleter } from '@/utils/apiHelpers';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import { useGetNotificationsQuery } from '@/store/services/designWorkflow';

type Props = {
	title: string;
	children: React.ReactNode;
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

const NavigationBar = ({ title, children }: Props) => {
	const pathname = usePathname();
	const { data: session } = useSession();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [railOpen, setRailOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const { t, language, setLanguage } = useLanguage();
	const profile = useAppSelector(getProfilState);
	const unreadNotificationsQuery = useGetNotificationsQuery(
		{ unread: true },
		{ skip: !session || (!profile.role && !profile.is_staff) },
	);
	const unreadNotifications = unreadNotificationsQuery.data?.length ?? 0;
	const isSuperuser = Boolean((profile as { is_superuser?: boolean }).is_superuser);
	const hasManagerAccess = profile.role === 'manager' || profile.is_staff || isSuperuser;

	useEffect(() => {
		const syncViewport = () => setIsMobile(window.innerWidth <= 1023);
		syncViewport();
		window.addEventListener('resize', syncViewport);
		return () => window.removeEventListener('resize', syncViewport);
	}, []);

	const workflowItems = useMemo<NavItem[]>(
		() =>
			hasManagerAccess
				? [
						{ label: t.navigation.overview, path: DASHBOARD_OVERVIEW, icon: <LayoutDashboard size={16} /> },
						{ label: t.navigation.board, path: DASHBOARD_BOARD, icon: <BriefcaseBusiness size={16} /> },
						{ label: t.navigation.projects, path: DASHBOARD_PROJECTS, icon: <FolderKanban size={16} /> },
						{ label: t.navigation.team, path: DASHBOARD_TEAM, icon: <Users size={16} /> },
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
						? 'border-[color:var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[var(--shadow-sm)]'
						: 'text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[var(--ink)]',
				].join(' ')}
			>
				<span className={active ? 'text-[var(--accent-strong)]' : 'text-[var(--ink-soft)]'}>{item.icon}</span>
				<span className="workflow-nav-text min-w-0 flex-1 truncate">{item.label}</span>
				{item.badge ? (
					<span
						className={[
							'workflow-nav-badge inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
							active ? 'bg-[var(--accent-strong)] text-white' : 'bg-[var(--ink)] text-white',
						].join(' ')}
					>
						{item.badge}
					</span>
				) : null}
			</Link>
		);
	};

	const profileAvatar = (
		<div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[8px] bg-[var(--surface-strong)]">
			{profile.avatar_cropped ? (
				<Image
					src={profile.avatar_cropped as string}
					alt={`${profile.first_name} ${profile.last_name}`}
					fill
					sizes="40px"
					className="object-cover"
				/>
			) : (
				<span className="text-sm font-semibold text-[var(--ink)]">
					{(profile.first_name?.[0] ?? 'D').toUpperCase()}
					{(profile.last_name?.[0] ?? 'W').toUpperCase()}
				</span>
			)}
		</div>
	);

	return (
		<div className={['workflow-shell', railOpen ? 'workflow-shell-expanded' : ''].join(' ')}>
			<aside className={['workflow-rail app-card hidden flex-col p-3 lg:flex', railOpen ? 'workflow-rail-expanded' : 'items-center'].join(' ')}>
				<div className="flex w-full items-center justify-between gap-3 border-b border-[color:var(--line)] pb-4">
					<div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[var(--accent)] text-sm font-semibold text-white shadow-[var(--shadow-sm)]">
						DW
					</div>
					<div className="workflow-rail-title min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Design Workflow</p>
						<p className="truncate text-base font-semibold text-[var(--ink)]">{title}</p>
					</div>
					<button
						type="button"
						aria-label={railOpen ? 'Collapse navigation' : 'Expand navigation'}
						onClick={() => setRailOpen((current) => !current)}
						className="app-pill workflow-focus-ring flex h-10 w-10 shrink-0 items-center justify-center text-[var(--ink)]"
					>
						{railOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
					</button>
				</div>

				<nav aria-label="Workflow navigation" className={['mt-5 flex flex-1 flex-col gap-2', railOpen ? 'w-full items-stretch' : 'items-center'].join(' ')}>
					<p className="workflow-nav-section px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Workspace</p>
					{workflowItems.map(renderNavLink)}
					<div className="mt-5 w-full border-t border-[color:var(--line)] pt-4">
						<p className="workflow-nav-section mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
							{profile.is_staff ? t.navigation.users : t.navigation.settings}
						</p>
						<div className="flex flex-col items-center gap-2">{utilityItems.map(renderNavLink)}</div>
					</div>
				</nav>

				<div className="workflow-rail-user mt-5 rounded-[8px] border border-[color:var(--line)] bg-[var(--surface-muted)] p-3">
					<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Signed in</p>
					<p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">
						{profile.first_name} {profile.last_name}
					</p>
					<p className="mt-1 text-xs text-[var(--ink-soft)]">{profile.role || (profile.is_staff ? 'admin' : 'designer')}</p>
				</div>
			</aside>

			<div className="workflow-main">
				<div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4">
					<header className="workflow-topbar app-card overflow-visible px-3 py-3 sm:px-4">
						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								aria-label={t.accessibility.toggleDrawer}
								onClick={() => setMobileMenuOpen((current) => !current)}
								className={[
									'app-pill workflow-focus-ring flex h-11 w-11 items-center justify-center text-[var(--ink)] lg:hidden',
									isMobile ? 'inline-flex' : 'hidden',
								].join(' ')}
							>
								<Menu size={18} />
							</button>

							<div className="app-pill flex items-center gap-3 px-3 py-2 lg:hidden">
								<div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--accent)] text-sm font-semibold text-white">
									DW
								</div>
								<div className="hidden sm:block">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
										Design Workflow
									</p>
									<p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
								</div>
							</div>

							<label className="app-pill hidden min-w-[280px] flex-1 items-center gap-3 px-3 py-2.5 text-sm text-[var(--ink-soft)] md:flex">
								<Search size={17} />
								<input
									aria-label="Search tasks, projects, or teammates"
									placeholder="Search tasks, projects, teammates"
									className="min-w-0 flex-1 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
								/>
								<span className="hidden items-center gap-1 rounded-[6px] border border-[color:var(--line)] px-2 py-1 text-[11px] font-semibold text-[var(--ink-muted)] xl:inline-flex">
									<Command size={12} /> K
								</span>
							</label>

							<div className="ml-auto flex items-center gap-2">
							{(profile.is_staff || isSuperuser) && (
									<a
										href={BACKEND_SITE_ADMIN}
										target="_blank"
										rel="noopener noreferrer"
										className="app-pill workflow-focus-ring hidden items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--ink-soft)] transition hover:text-[var(--ink)] xl:inline-flex"
									>
										<Shield size={16} />
										<span>{t.navigation.administration}</span>
									</a>
								)}
								<button
									type="button"
									onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
									className="app-pill workflow-focus-ring hidden items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--ink-soft)] transition hover:text-[var(--ink)] sm:inline-flex"
								>
									<span aria-hidden="true">{language === 'fr' ? '🇬🇧' : '🇫🇷'}</span>
									<span>{language === 'fr' ? 'EN' : 'FR'}</span>
								</button>

								<div className="relative">
									<button
										type="button"
										onClick={() => setProfileMenuOpen((current) => !current)}
										className="app-pill workflow-focus-ring flex items-center gap-3 px-3 py-2 text-left"
									>
										{profileAvatar}
										<div className="hidden sm:block">
											<p className="text-xs font-medium text-[var(--ink-soft)]">{greeting}</p>
											<p className="text-sm font-semibold text-[var(--ink)]">
												{profile.first_name} {profile.last_name}
											</p>
										</div>
										<ChevronDown size={16} className="text-[var(--ink-soft)]" />
									</button>

									{profileMenuOpen ? (
										<div className="absolute right-0 top-[calc(100%+10px)] z-[100] flex min-w-[270px] flex-col gap-2 rounded-[8px] border border-[color:var(--line)] bg-white p-3 shadow-[var(--shadow-lg)]">
											<div className="rounded-[8px] bg-[var(--surface-muted)] px-3 py-3">
												<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
													{t.navigation.profile}
												</p>
												<p className="mt-1 text-sm font-semibold text-[var(--ink)]">
													{profile.first_name} {profile.last_name}
												</p>
											</div>
											<div className="flex flex-col gap-2 lg:hidden">{workflowItems.map(renderNavLink)}</div>
											<div className="flex flex-col gap-2">{utilityItems.map(renderNavLink)}</div>
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
							<div className="mt-3 flex flex-col gap-2 rounded-[8px] border border-[color:var(--line)] bg-[var(--surface-muted)] p-3 lg:hidden">
								<label className="app-input flex items-center gap-3 px-3 py-2">
									<Search size={17} className="text-[var(--ink-soft)]" />
									<input
										aria-label="Search tasks, projects, or teammates"
										placeholder="Search"
										className="min-w-0 flex-1 bg-transparent outline-none"
									/>
								</label>
								{workflowItems.map(renderNavLink)}
								<div className="rounded-[8px] border border-dashed border-[color:var(--line)] p-3">
									<p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
										{profile.is_staff || isSuperuser ? t.navigation.users : t.navigation.settings}
									</p>
									<div className="flex flex-col gap-2">{utilityItems.map(renderNavLink)}</div>
								</div>
							</div>
						) : null}
					</header>

					<main className="min-w-0 pb-6">{children}</main>
				</div>
			</div>
		</div>
	);
};

export default NavigationBar;
