import type { ReactNode } from 'react';
import {
	Bell,
	BriefcaseBusiness,
	CircleUserRound,
	FolderKanban,
	KeyRound,
	LayoutDashboard,
	MessagesSquare,
	Shield,
	Users,
} from 'lucide-react';
import type { TranslationDictionary } from '@/types/languageTypes';
import {
	DASHBOARD_BOARD,
	DASHBOARD_CHAT,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_NOTIFICATIONS,
	DASHBOARD_OVERVIEW,
	DASHBOARD_PASSWORD,
	DASHBOARD_PROJECTS,
	DASHBOARD_REPORTS_TIME,
	DASHBOARD_TEAM,
	USERS_ADD,
	USERS_LIST,
} from '@/utils/routes';

export type WorkflowNavItem = {
	label: string;
	path: string;
	icon: ReactNode;
	badge?: number;
};

export const getWorkflowNavigation = (
	t: TranslationDictionary,
	hasManagerAccess: boolean,
	unreadNotifications = 0,
	unreadChatMessages = 0,
): WorkflowNavItem[] => [
	...(hasManagerAccess
		? [{ label: t.navigation.overview, path: DASHBOARD_OVERVIEW, icon: <LayoutDashboard size={16} /> }]
		: []),
	{ label: t.navigation.board, path: DASHBOARD_BOARD, icon: <BriefcaseBusiness size={16} /> },
	{ label: t.navigation.projects, path: DASHBOARD_PROJECTS, icon: <FolderKanban size={16} /> },
	...(hasManagerAccess ? [{ label: t.navigation.team, path: DASHBOARD_TEAM, icon: <Users size={16} /> }] : []),
	{
		label: t.workflow.labels.chatTitle ?? 'Chat',
		path: DASHBOARD_CHAT,
		icon: <MessagesSquare size={16} />,
		badge: unreadChatMessages,
	},
	...(hasManagerAccess
		? [{ label: t.navigation.reports, path: DASHBOARD_REPORTS_TIME, icon: <Shield size={16} /> }]
		: []),
	{
		label: t.navigation.notifications,
		path: DASHBOARD_NOTIFICATIONS,
		icon: <Bell size={16} />,
		badge: unreadNotifications,
	},
];

export const getWorkflowUtilities = (t: TranslationDictionary, hasUserAccess: boolean): WorkflowNavItem[] => [
	...(hasUserAccess
		? [
				{ label: t.navigation.usersList, path: USERS_LIST, icon: <Users size={16} /> },
				{ label: t.navigation.newUser, path: USERS_ADD, icon: <Users size={16} /> },
			]
		: []),
	{ label: t.navigation.myProfile, path: DASHBOARD_EDIT_PROFILE, icon: <CircleUserRound size={16} /> },
	{ label: t.navigation.changePassword, path: DASHBOARD_PASSWORD, icon: <KeyRound size={16} /> },
];
