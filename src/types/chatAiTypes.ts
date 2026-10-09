export type ChatResource = 'project' | 'task' | 'message';
export type ChatNavigation = {
	application: 'design_workflow';
	company_id: number;
	resource: string;
	identifier: number | null;
	href: string;
};
export type ChatRecord = {
	id: number;
	name: string;
	description?: string;
	project?: string;
	assignee?: string;
	status?: string;
	priority?: string;
	archived?: boolean;
	can_edit?: boolean;
	can_archive?: boolean;
	date?: string | null;
	navigation: ChatNavigation;
};
export type ChatConfirmation = {
	type: 'confirmation';
	action_id: string;
	resource: 'project' | 'task';
	record_id: number;
	operation: 'update' | 'archive';
	label: string;
	changes: Record<string, string | null>;
	before: Record<string, string | null>;
	running_tasks: number;
	expires_at: string;
};
export type ChatCard =
	| { type: 'record_list'; resource: ChatResource; items: ChatRecord[]; has_more?: boolean }
	| { type: 'navigation'; target: ChatNavigation }
	| ChatConfirmation
	| { type: 'confirmation_status'; status: 'completed' | 'expired' }
	| { type: 'workload_summary'; counts: Record<string, number>; project: string; mine: boolean }
	| {
			type: 'time_report';
			minutes: number;
			project: string;
			date_from: string | null;
			date_to: string | null;
			navigation: ChatNavigation;
	  }
	| { type: 'knowledge'; documents: Array<{ document_id: string; version: string; title: string }> };
export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; cards: ChatCard[] };
export type ChatConversation = { id: string; title: string; updated_at: string };
export type ChatCapabilities = {
	can_report: boolean;
	can_view_management_pages?: boolean;
	idle_meme_enabled?: boolean;
	suggestions: string[];
	shortcuts: Array<{ command: string; title: string; help: string; example: string }>;
};
export type ChatContext = { interface_language: 'fr' | 'en'; resource?: 'project' | 'task'; identifier?: number };

export type IdleMemeProgress = { shown: 0 | 1 | 2; disabled: boolean; lastShownAt: number };
