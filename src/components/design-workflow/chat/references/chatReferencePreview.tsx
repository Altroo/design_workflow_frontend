'use client';
import { userLabel } from '@/utils/workflow/chatHelpers';
import { DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';
import { BriefcaseBusiness, CheckSquare2, X } from 'lucide-react';
import Link from 'next/link';
import type { ChatController } from '@/utils/workflow/hooks/useChatController';
export const ChatReferencePreview = ({
	model,
}: {
	model: Pick<ChatController, 'setPreviewTarget' | 'previewTask' | 'previewProject' | 'statusLabelFor' | 't'>;
}) => {
	const { setPreviewTarget, previewTask, previewProject, statusLabelFor, t } = model;
	if (!previewTask && !previewProject) return null;
	return (
		<div className="workflow-chat-ref-overlay" onClick={() => setPreviewTarget(null)}>
			<aside className="workflow-chat-refs workflow-chat-preview-drawer" aria-label={previewTask?.title ?? previewProject?.name} onClick={(event) => event.stopPropagation()}>
				<div className="workflow-chat-ref-drawer-head">
					<div className="workflow-chat-ref-drawer-title">
						<span>{previewTask ? <CheckSquare2 size={18} /> : <BriefcaseBusiness size={18} />}</span>
						<div>
							<p>{previewTask ? previewTask.title : previewProject?.name}</p>
							<small>{previewTask ? previewTask.project.name : statusLabelFor(previewProject?.status)}</small>
						</div>
					</div>
					<button type="button" onClick={() => setPreviewTarget(null)} aria-label={t.common.close ?? 'Close'}>
						<X size={16} />
					</button>
				</div>
				<div className="workflow-chat-preview-body">
					<p>{previewTask ? previewTask.description : previewProject?.description}</p>
					<div className="workflow-chat-preview-meta">
						<span>
							{previewTask
								? (t.workflow.statuses[previewTask.status] ?? previewTask.status)
								: previewProject
									? (t.workflow.statuses[previewProject.status] ?? previewProject.status)
									: ''}
						</span>
						<span>
							{previewTask?.current_assignee
								? userLabel(previewTask.current_assignee)
								: previewProject?.manager
									? userLabel(previewProject.manager)
									: ''}
						</span>
					</div>
					<Link
						href={previewTask ? DASHBOARD_TASK_VIEW(previewTask.id) : DASHBOARD_PROJECT_VIEW(previewProject!.id)}
						className="app-button"
					>
						{t.workflow.buttons.open ?? 'Open'}
					</Link>
				</div>
			</aside>
		</div>
	);
};
