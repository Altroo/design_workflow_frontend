export type DesktopNotice = {
	key: string;
	title: string;
	body: string;
	href: string;
};

export type DesktopNotificationPreferences = {
	enabled: boolean;
	sound: boolean;
};

export type DesktopNotificationPermission = NotificationPermission | 'unsupported';
