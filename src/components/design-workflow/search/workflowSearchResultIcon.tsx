'use client';
import type { WorkspaceSearchResult } from '@/types/designWorkflowTypes';
import { FolderKanban, ListTodo, MessagesSquare, Paperclip, Users } from 'lucide-react';
export const renderSearchResultIcon = (result: WorkspaceSearchResult) => {
	if (result.type === 'task') return <ListTodo size={15} />;
	if (result.type === 'project') return <FolderKanban size={15} />;
	if (result.type === 'chat') return <MessagesSquare size={15} />;
	if (result.type === 'file') return <Paperclip size={15} />;
	return <Users size={15} />;
};
