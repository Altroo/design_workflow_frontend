import type { ReactNode } from 'react';
import { Bookmark, CheckCircle2, CircleAlert, Clock3, ListTodo, ShieldCheck } from 'lucide-react';
import type { TaskStatus } from '@/types/designWorkflowTypes';

export const STATUS_COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'];

export const BOARD_STATUS_META: Record<TaskStatus, { accent: string; text: string; soft: string; icon: ReactNode }> = {
	backlog: { accent: '#64748b', text: '#334155', soft: '#f8fafc', icon: <Bookmark size={14} /> },
	todo: { accent: '#4f46e5', text: '#312e81', soft: '#eef2ff', icon: <ListTodo size={14} /> },
	in_progress: { accent: '#f59e0b', text: '#92400e', soft: '#fffbeb', icon: <Clock3 size={14} /> },
	in_review: { accent: '#06b6d4', text: '#155e75', soft: '#ecfeff', icon: <ShieldCheck size={14} /> },
	blocked: { accent: '#e11d48', text: '#9f1239', soft: '#fff1f2', icon: <CircleAlert size={14} /> },
	done: { accent: '#22c55e', text: '#166534', soft: '#f0fdf4', icon: <CheckCircle2 size={14} /> },
};
