export type ChatDrawerMode = 'references' | 'media';

export type ChatSidebarSection = 'studio' | 'projects' | 'direct';

export type ChatSearchFilters = {
	has_files?: boolean;
	has_images?: boolean;
	sender_id?: number;
	date_from?: string;
	date_to?: string;
};
