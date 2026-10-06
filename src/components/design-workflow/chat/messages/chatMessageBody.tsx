import { mentionTokenFor, referenceTokenFor, userLabel } from '@/utils/workflow/chatHelpers';
import type { ProjectSummary, TaskCard, WorkflowUser } from '@/types/designWorkflowTypes';
import { DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';
import Link from 'next/link';
export const renderLinkedMessageBody = (
	body: string,
	users: WorkflowUser[],
	tasks: TaskCard[],
	projects: ProjectSummary[],
) => {
	const taskByToken = new Map(
		tasks.flatMap((task) => [
			[`#T${task.id}`.toLowerCase(), task] as const,
			[referenceTokenFor(task.title).toLowerCase(), task] as const,
		]),
	);
	const projectByToken = new Map(
		projects.flatMap((project) => [
			[`#P${project.id}`.toLowerCase(), project] as const,
			[referenceTokenFor(project.name).toLowerCase(), project] as const,
		]),
	);
	const userByToken = new Map(users.map((user) => [`@${mentionTokenFor(user)}`, user]));
	const parts = body.split(/(@[\w.-]+|#(?:T\d+|P\d+|[\w-]+))/gi);

	return parts.map((part, index) => {
		if (!part) return null;
		const key = `${part}-${index}`;
		const lower = part.toLowerCase();
		const user = userByToken.get(lower);
		if (user) {
			return (
				<span key={key} className="workflow-chat-inline-tag workflow-chat-inline-tag-user">
					@{userLabel(user)}
				</span>
			);
		}
		const task = taskByToken.get(lower);
		if (task) {
			return (
				<Link
					key={key}
					href={DASHBOARD_TASK_VIEW(task.id)}
					className="workflow-chat-inline-tag workflow-chat-inline-tag-task"
					data-testid={`workflow-chat-task-link-${task.id}`}
				>
					#{task.title}
				</Link>
			);
		}
		const project = projectByToken.get(lower);
		if (project) {
			return (
				<Link
					key={key}
					href={DASHBOARD_PROJECT_VIEW(project.id)}
					className="workflow-chat-inline-tag workflow-chat-inline-tag-project"
				>
					#{project.name}
				</Link>
			);
		}
		return part;
	});
};
