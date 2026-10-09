export type AiAssistAction = 'translate' | 'fix_grammar' | 'professionalize';
export type AiWritingContext =
	| 'project_title'
	| 'project_description'
	| 'task_title'
	| 'task_description'
	| 'comment'
	| 'chat_message'
	| 'checklist_title'
	| 'checklist_item'
	| 'image_description'
	| 'review_note'
	| 'version_note'
	| 'annotation'
	| 'reminder_note'
	| 'reassignment_reason'
	| 'blocked_reason';

export type AiAssistRequest = {
	action: AiAssistAction;
	text: string;
	source_language: 'auto' | 'fr' | 'en';
	target_language?: 'fr' | 'en';
	context: AiWritingContext;
};

export type AiAssistResponse = { original_text: string; suggested_text: string };

export type AiAssistantControlProps = {
	value: string;
	onApply: (value: string) => void;
	context: AiWritingContext;
	disabled?: boolean;
	maxLength?: number;
};
