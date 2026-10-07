import { getDueDeliveryInfo, resolveMediaUrl } from '@/utils/workflow/workflowFormatting';
import { getChecklistTemplates } from '@/utils/workflow/workflowFormHelpers';
import type { TaskDetail } from '@/types/designWorkflowTypes';
import type { ChecklistTemplate, TaskChecklistGroup, TaskDetailTab } from '@/types/workflowUiTypes';
import { DASHBOARD_CHAT } from '@/utils/routes';
import {
	ArrowRight,
	CheckCircle2,
	Clock3,
	ImagePlus,
	ListTodo,
	MessagesSquare,
	Paperclip,
	ShieldCheck,
	Tag,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const createTaskDetailModel = (
	model: Pick<
		WorkflowController,
		| 'taskBusy'
		| 'workflow'
		| 'task'
		| 'isManager'
		| 'taskCommentsPage'
		| 'taskActivityPage'
		| 'taskAddPanel'
		| 'selectedChecklistTemplate'
		| 'setSelectedChecklistTemplate'
		| 'setNewChecklistGroupTitle'
		| 'runPrimaryAction'
		| 'newChecklistGroupTitle'
		| 'addChecklist'
		| 'addChecklistItem'
		| 'messageFor'
		| 'newChecklistItemsByChecklist'
		| 'setNewChecklistItemsByChecklist'
		| 'selectedAnnotationAttachmentId'
		| 'reviewStateDraft'
		| 'updateTaskReviewState'
		| 'pendingReviewTaskId'
		| 'taskMutable'
		| 'createTaskVersion'
		| 'versionAttachmentId'
		| 'versionNotes'
		| 'versionApprovalState'
		| 'setVersionNotes'
		| 'setVersionApprovalState'
		| 'annotationBody'
		| 'createAttachmentAnnotation'
		| 'annotationVersionId'
		| 'annotationX'
		| 'annotationY'
		| 'annotationResolved'
		| 'setAnnotationBody'
		| 'setAnnotationResolved'
		| 'selectedTaskId'
		| 'labelFor'
		| 'cardTitleHeading'
		| 'modalTitleDraft'
		| 'setModalTitleDraft'
		| 'renameLockRef'
		| 'updateTaskState'
		| 'updateTask'
		| 't'
		| 'taskConflictNotice'
		| 'setReviewConfirmation'
		| 'submitReviewUpdate'
		| 'toggleTaskAddPanel'
		| 'archiveTask'
		| 'setTaskAddPanel'
		| 'setModalLabelComposerOpen'
		| 'setEditingLabelId'
		| 'labels'
		| 'workflowDataReady'
		| 'setEditingLabelName'
		| 'setEditingLabelColor'
		| 'modalLabelComposerOpen'
		| 'newLabelName'
		| 'setNewLabelName'
		| 'newLabelColor'
		| 'setNewLabelColor'
		| 'createLabel'
		| 'editingLabelId'
		| 'editingLabelName'
		| 'editingLabelColor'
		| 'updateLabelState'
		| 'updateLabel'
		| 'addChecklistState'
		| 'taskCoverLabel'
		| 'setTaskCoverLabel'
		| 'setTaskCoverFile'
		| 'taskCoverFile'
		| 'isPreparingTaskCover'
		| 'handleUploadTaskCover'
		| 'uploadTaskCoverState'
		| 'renderTaskAttachmentPicker'
		| 'reassignForm'
		| 'setReassignForm'
		| 'assignableUsers'
		| 'validReassignAssigneeSelected'
		| 'reassignTask'
		| 'reassignTaskState'
		| 'modalDescriptionEditing'
		| 'taskEditForm'
		| 'setTaskEditForm'
		| 'mentionableUsers'
		| 'taskUpdatePayload'
		| 'setModalDescriptionEditing'
		| 'taskEditBaselineRef'
		| 'chartTextColor'
		| 'dateFor'
		| 'deleteChecklist'
		| 'updateChecklistItem'
		| 'deleteChecklistItem'
		| 'addChecklistItemState'
		| 'taskMediaMutable'
		| 'setMediaDeleteTarget'
		| 'openAttachmentPreview'
		| 'handleSetAttachmentAsCover'
		| 'setTaskCoverFromAttachmentState'
		| 'commentBody'
		| 'setCommentBody'
		| 'addTaskComment'
		| 'addCommentState'
		| 'dateTimeFor'
		| 'describeWorkflowActivity'
		| 'taskDetailTab'
		| 'setTaskDetailTab'
		| 'reviewNotes'
		| 'setReviewNotes'
		| 'setVersionAttachmentId'
		| 'createTaskVersionState'
		| 'setSelectedAnnotationAttachmentId'
		| 'selectedAttachmentAnnotations'
		| 'setAnnotationVersionId'
		| 'setAnnotationX'
		| 'setAnnotationY'
		| 'createAnnotationState'
		| 'updateTaskStatus'
		| 'updateStatusState'
		| 'setTaskCommentsPage'
		| 'setTaskActivityPage'
	> & { task: TaskDetail },
) => {
	const {
		taskBusy,
		workflow,
		task,
		isManager,
		taskCommentsPage,
		taskActivityPage,
		taskAddPanel,
		selectedChecklistTemplate,
		setSelectedChecklistTemplate,
		setNewChecklistGroupTitle,
		runPrimaryAction,
		newChecklistGroupTitle,
		addChecklist,
		addChecklistItem,
		messageFor,
		newChecklistItemsByChecklist,
		setNewChecklistItemsByChecklist,
		selectedAnnotationAttachmentId,
		reviewStateDraft,
		updateTaskReviewState,
		pendingReviewTaskId,
		taskMutable,
		createTaskVersion,
		versionAttachmentId,
		versionNotes,
		versionApprovalState,
		setVersionNotes,
		setVersionApprovalState,
		annotationBody,
		createAttachmentAnnotation,
		annotationVersionId,
		annotationX,
		annotationY,
		annotationResolved,
		setAnnotationBody,
		setAnnotationResolved,
		selectedTaskId,
		labelFor,
		cardTitleHeading,
		modalTitleDraft,
		setModalTitleDraft,
		renameLockRef,
		updateTaskState,
		updateTask,
		t,
		taskConflictNotice,
		setReviewConfirmation,
		submitReviewUpdate,
		toggleTaskAddPanel,
		archiveTask,
		setTaskAddPanel,
		setModalLabelComposerOpen,
		setEditingLabelId,
		labels,
		workflowDataReady,
		setEditingLabelName,
		setEditingLabelColor,
		modalLabelComposerOpen,
		newLabelName,
		setNewLabelName,
		newLabelColor,
		setNewLabelColor,
		createLabel,
		editingLabelId,
		editingLabelName,
		editingLabelColor,
		updateLabelState,
		updateLabel,
		addChecklistState,
		taskCoverLabel,
		setTaskCoverLabel,
		setTaskCoverFile,
		taskCoverFile,
		isPreparingTaskCover,
		handleUploadTaskCover,
		uploadTaskCoverState,
		renderTaskAttachmentPicker,
		reassignForm,
		setReassignForm,
		assignableUsers,
		validReassignAssigneeSelected,
		reassignTask,
		reassignTaskState,
		modalDescriptionEditing,
		taskEditForm,
		setTaskEditForm,
		mentionableUsers,
		taskUpdatePayload,
		setModalDescriptionEditing,
		taskEditBaselineRef,
		chartTextColor,
		dateFor,
		deleteChecklist,
		updateChecklistItem,
		deleteChecklistItem,
		addChecklistItemState,
		taskMediaMutable,
		setMediaDeleteTarget,
		openAttachmentPreview,
		handleSetAttachmentAsCover,
		setTaskCoverFromAttachmentState,
		commentBody,
		setCommentBody,
		addTaskComment,
		addCommentState,
		dateTimeFor,
		describeWorkflowActivity,
		taskDetailTab,
		setTaskDetailTab,
		reviewNotes,
		setReviewNotes,
		setVersionAttachmentId,
		createTaskVersionState,
		setSelectedAnnotationAttachmentId,
		selectedAttachmentAnnotations,
		setAnnotationVersionId,
		setAnnotationX,
		setAnnotationY,
		createAnnotationState,
		updateTaskStatus,
		updateStatusState,
		setTaskCommentsPage,
		setTaskActivityPage,
	} = model;
	const taskPageSize = 5;
	const visibleTaskActivity = isManager
		? task.recent_activity
		: task.recent_activity.filter((activity) => activity.action_type !== 'time_logged');
	const taskCommentsTotalPages = Math.max(1, Math.ceil(task.comments.length / taskPageSize));
	const taskActivityTotalPages = Math.max(1, Math.ceil(visibleTaskActivity.length / taskPageSize));
	const pagedTaskComments = task.comments.slice((taskCommentsPage - 1) * taskPageSize, taskCommentsPage * taskPageSize);
	const pagedTaskActivity = visibleTaskActivity.slice(
		(taskActivityPage - 1) * taskPageSize,
		taskActivityPage * taskPageSize,
	);
	const coverInputId = `task-cover-${task.id}`;
	const attachmentInputId = `task-attachment-${task.id}`;
	const checklistGroups: TaskChecklistGroup[] =
		(task.checklists ?? []).length > 0
			? task.checklists
			: task.checklist_items.length > 0
				? [
						{
							id: 0,
							title: workflow.labels.checklistPanel ?? 'Checklist',
							sort_order: 0,
							items: task.checklist_items,
						},
					]
				: [];
	const checklistDoneCount = checklistGroups.reduce(
		(total, group) => total + group.items.filter((item) => item.done).length,
		0,
	);
	const checklistItemsCount = checklistGroups.reduce((total, group) => total + group.items.length, 0);
	const checklistProgress = checklistItemsCount ? (checklistDoneCount / checklistItemsCount) * 100 : 0;
	const taskDueDelivery = getDueDeliveryInfo(task, workflow.labels);
	const taskRestoreLocked = task.archived && task.project.archived;
	const showLabelsPanel = task.labels.length > 0 || taskAddPanel === 'labels';
	const showChecklistPanel = checklistGroups.length > 0 || taskAddPanel === 'checklist';
	const showAttachmentsPanel =
		task.attachments.length > 0 || task.cover_image_url || taskAddPanel === 'attachments' || taskAddPanel === 'cover';
	const modalHasLabels = task.labels.length > 0;
	const modalHasDates = Boolean(task.due_date);
	const modalHasChecklist = checklistGroups.length > 0;
	const modalHasAttachments = task.attachments.length > 0 || Boolean(task.cover_image_url);
	const checklistTemplates = getChecklistTemplates(workflow.labels);
	const activeChecklistTemplate = checklistTemplates.find((template) => template.key === selectedChecklistTemplate);
	const selectChecklistTemplate = (template: ChecklistTemplate) => {
		if (selectedChecklistTemplate === template.key) {
			setSelectedChecklistTemplate('');
			return;
		}
		setSelectedChecklistTemplate(template.key);
		setNewChecklistGroupTitle(template.title);
	};
	const createChecklistForTask = async () => {
		await runPrimaryAction(
			async () => {
				const title =
					newChecklistGroupTitle.trim() ||
					activeChecklistTemplate?.title ||
					(workflow.labels.checklistPanel ?? 'Checklist');
				const checklist = await addChecklist({ id: task.id, title, sort_order: checklistGroups.length }).unwrap();
				if (activeChecklistTemplate) {
					for (const [index, itemTitle] of activeChecklistTemplate.items.entries()) {
						await addChecklistItem({
							id: task.id,
							checklist_id: checklist.id,
							title: itemTitle,
							sort_order: index,
						}).unwrap();
					}
				}
				setNewChecklistGroupTitle('');
				setSelectedChecklistTemplate('');
			},
			messageFor('Liste ajoutée avec succès.', 'Checklist added successfully.'),
			messageFor('Impossible d’ajouter la liste.', 'Could not add the checklist.'),
		);
	};
	const addChecklistItemToGroup = async (group: TaskChecklistGroup) => {
		const key = String(group.id);
		const title = (newChecklistItemsByChecklist[key] ?? '').trim();
		if (!title) return;
		await runPrimaryAction(
			async () => {
				await addChecklistItem({
					id: task.id,
					checklist_id: group.id > 0 ? group.id : undefined,
					title,
					sort_order: group.items.length,
				}).unwrap();
				setNewChecklistItemsByChecklist((current) => ({ ...current, [key]: '' }));
			},
			messageFor('Élément ajouté avec succès.', 'Item added successfully.'),
			messageFor('Impossible d’ajouter l’élément.', 'Could not add the item.'),
		);
	};
	const addOptions = [
		{
			key: 'labels' as const,
			icon: <Tag size={18} />,
			title: workflow.labels.labelsPanel ?? 'Labels',
			body: workflow.labels.addLabelsHint ?? 'Organize and classify this card.',
		},
		{
			key: 'checklist' as const,
			icon: <CheckCircle2 size={18} />,
			title: workflow.labels.checklistPanel ?? 'Checklist',
			body: workflow.labels.addChecklistHint ?? 'Add subtasks and track progress.',
		},
		{
			key: 'cover' as const,
			icon: <ImagePlus size={18} />,
			title: workflow.labels.cardImage ?? 'Card image',
			body: workflow.labels.addCoverHint ?? 'Add a visual cover to this card.',
		},
		{
			key: 'attachments' as const,
			icon: <Paperclip size={18} />,
			title: workflow.labels.attachmentsPanel ?? 'Attachments',
			body: workflow.labels.addAttachmentsHint ?? 'Attach files, briefs, and links.',
		},
		{
			key: 'members' as const,
			icon: <Users size={18} />,
			title: workflow.labels.membersPanel ?? 'Members',
			body: workflow.labels.addMembersHint ?? 'Assign or reassign the card.',
		},
	];
	const detailTabs: Array<{ key: TaskDetailTab; label: string; icon: ReactNode }> = [
		{ key: 'overview', label: workflow.labels.overview ?? 'Overview', icon: <ListTodo size={16} /> },
		{ key: 'review', label: workflow.labels.review ?? 'Review', icon: <ShieldCheck size={16} /> },
		{ key: 'files', label: workflow.labels.files ?? 'Files', icon: <Paperclip size={16} /> },
		{ key: 'activity', label: workflow.sections.activity.title, icon: <MessagesSquare size={16} /> },
		{ key: 'time', label: workflow.sections.timeEntries.title, icon: <Clock3 size={16} /> },
	];
	const selectedAnnotationAttachment =
		task.attachments.find((attachment) => attachment.id === selectedAnnotationAttachmentId) ??
		task.attachments[0] ??
		null;
	const selectedAnnotationAttachmentUrl = selectedAnnotationAttachment
		? resolveMediaUrl(selectedAnnotationAttachment.thumbnail_url)
		: '';
	const selectedAnnotationVersionOptions = task.artifact_versions.filter(
		(version) =>
			!selectedAnnotationAttachment || !version.attachment || version.attachment.id === selectedAnnotationAttachment.id,
	);
	const handoffTemplate = checklistTemplates.find((template) => template.key === 'delivery');
	const displayReviewState = reviewStateDraft ?? task.review_state;
	const reviewTone: 'urgent' | 'progress' | 'neutral' | 'warning' =
		displayReviewState === 'approved'
			? 'progress'
			: displayReviewState === 'changes_requested'
				? 'urgent'
				: displayReviewState === 'needs_review'
					? 'warning'
					: 'neutral';
	const sourceChatHref = task.source_chat_thread_id
		? `${DASHBOARD_CHAT}?thread=${task.source_chat_thread_id}${task.source_chat_message_id ? `&message=${task.source_chat_message_id}` : ''}`
		: DASHBOARD_CHAT;
	const renderSourceChatLink = (mode: 'modal' | 'detail') => {
		if (!task.source_chat_message_id) return null;
		return (
			<section
				className={
					mode === 'modal'
						? 'workflow-trello-modal-section workflow-trello-modal-section-compact'
						: 'workflow-source-chat-card'
				}
			>
				<div className={mode === 'modal' ? 'workflow-trello-modal-section-head' : 'workflow-source-chat-card-head'}>
					<MessagesSquare size={18} />
					<h3>{workflow.labels.sourceChatMessage ?? 'Source chat message'}</h3>
				</div>
				<p>{workflow.labels.sourceChatHint ?? 'This task was created from a chat decision.'}</p>
				<Link
					href={sourceChatHref}
					className={mode === 'modal' ? 'workflow-trello-modal-save' : 'app-button app-button-secondary'}
				>
					<ArrowRight size={15} />
					<span>{workflow.buttons.openSourceChat ?? 'Open source chat'}</span>
				</Link>
			</section>
		);
	};
	const reviewLocked = updateTaskReviewState.isLoading || pendingReviewTaskId === task.id;
	const canSubmitReview =
		!isManager && taskMutable && ['not_submitted', 'changes_requested', 'approved'].includes(displayReviewState);
	const canManagerReview = isManager && displayReviewState === 'needs_review';
	const requestReviewLabel =
		displayReviewState === 'changes_requested'
			? (workflow.buttons.resubmitReview ?? 'Resubmit for review')
			: displayReviewState === 'approved'
				? (workflow.buttons.requestNewReview ?? 'Request a new review')
				: (workflow.buttons.requestReview ?? 'Request review');
	const submitArtifactVersion = async () => {
		await runPrimaryAction(
			async () => {
				await createTaskVersion({
					id: task.id,
					attachment_id: versionAttachmentId ? Number(versionAttachmentId) : null,
					notes: versionNotes.trim(),
					approval_state: versionApprovalState,
				}).unwrap();
				setVersionNotes('');
				setVersionApprovalState('pending');
			},
			messageFor('Version ajoutée avec succès.', 'Version added successfully.'),
			messageFor('Impossible d’ajouter la version.', 'Could not add the version.'),
		);
	};
	const submitAnnotation = async () => {
		if (!selectedAnnotationAttachment || !annotationBody.trim()) return;
		await runPrimaryAction(
			async () => {
				await createAttachmentAnnotation({
					attachmentId: selectedAnnotationAttachment.id,
					version_id: annotationVersionId ? Number(annotationVersionId) : null,
					x_percent: annotationX || '50',
					y_percent: annotationY || '50',
					body: annotationBody.trim(),
					resolved: annotationResolved,
				}).unwrap();
				setAnnotationBody('');
				setAnnotationResolved(false);
			},
			messageFor('Annotation ajoutée avec succès.', 'Annotation added successfully.'),
			messageFor('Impossible d’ajouter l’annotation.', 'Could not add the annotation.'),
		);
	};
	const createHandoffChecklist = async () => {
		if (!handoffTemplate) return;
		await runPrimaryAction(
			async () => {
				const checklist = await addChecklist({
					id: task.id,
					title: handoffTemplate.title,
					sort_order: checklistGroups.length,
				}).unwrap();
				for (const [index, itemTitle] of handoffTemplate.items.entries()) {
					await addChecklistItem({
						id: task.id,
						checklist_id: checklist.id,
						title: itemTitle,
						sort_order: index,
					}).unwrap();
				}
			},
			messageFor('Checklist de livraison ajoutée.', 'Handoff checklist added.'),
			messageFor('Impossible d’ajouter la checklist de livraison.', 'Could not add the handoff checklist.'),
		);
	};
	return {
		...model,
		taskBusy,
		workflow,
		task,
		isManager,
		taskCommentsPage,
		taskActivityPage,
		taskAddPanel,
		selectedChecklistTemplate,
		setSelectedChecklistTemplate,
		setNewChecklistGroupTitle,
		runPrimaryAction,
		newChecklistGroupTitle,
		addChecklist,
		addChecklistItem,
		messageFor,
		newChecklistItemsByChecklist,
		setNewChecklistItemsByChecklist,
		selectedAnnotationAttachmentId,
		reviewStateDraft,
		updateTaskReviewState,
		pendingReviewTaskId,
		taskMutable,
		createTaskVersion,
		versionAttachmentId,
		versionNotes,
		versionApprovalState,
		setVersionNotes,
		setVersionApprovalState,
		annotationBody,
		createAttachmentAnnotation,
		annotationVersionId,
		annotationX,
		annotationY,
		annotationResolved,
		setAnnotationBody,
		setAnnotationResolved,
		selectedTaskId,
		labelFor,
		cardTitleHeading,
		modalTitleDraft,
		setModalTitleDraft,
		renameLockRef,
		updateTaskState,
		updateTask,
		t,
		taskConflictNotice,
		setReviewConfirmation,
		submitReviewUpdate,
		toggleTaskAddPanel,
		archiveTask,
		setTaskAddPanel,
		setModalLabelComposerOpen,
		setEditingLabelId,
		labels,
		workflowDataReady,
		setEditingLabelName,
		setEditingLabelColor,
		modalLabelComposerOpen,
		newLabelName,
		setNewLabelName,
		newLabelColor,
		setNewLabelColor,
		createLabel,
		editingLabelId,
		editingLabelName,
		editingLabelColor,
		updateLabelState,
		updateLabel,
		addChecklistState,
		taskCoverLabel,
		setTaskCoverLabel,
		setTaskCoverFile,
		taskCoverFile,
		isPreparingTaskCover,
		handleUploadTaskCover,
		uploadTaskCoverState,
		renderTaskAttachmentPicker,
		reassignForm,
		setReassignForm,
		assignableUsers,
		validReassignAssigneeSelected,
		reassignTask,
		reassignTaskState,
		modalDescriptionEditing,
		taskEditForm,
		setTaskEditForm,
		mentionableUsers,
		taskUpdatePayload,
		setModalDescriptionEditing,
		taskEditBaselineRef,
		chartTextColor,
		dateFor,
		deleteChecklist,
		updateChecklistItem,
		deleteChecklistItem,
		addChecklistItemState,
		taskMediaMutable,
		setMediaDeleteTarget,
		openAttachmentPreview,
		handleSetAttachmentAsCover,
		setTaskCoverFromAttachmentState,
		commentBody,
		setCommentBody,
		addTaskComment,
		addCommentState,
		dateTimeFor,
		describeWorkflowActivity,
		taskDetailTab,
		setTaskDetailTab,
		reviewNotes,
		setReviewNotes,
		setVersionAttachmentId,
		createTaskVersionState,
		setSelectedAnnotationAttachmentId,
		selectedAttachmentAnnotations,
		setAnnotationVersionId,
		setAnnotationX,
		setAnnotationY,
		createAnnotationState,
		updateTaskStatus,
		updateStatusState,
		setTaskCommentsPage,
		setTaskActivityPage,
		taskPageSize,
		visibleTaskActivity,
		taskCommentsTotalPages,
		taskActivityTotalPages,
		pagedTaskComments,
		pagedTaskActivity,
		coverInputId,
		attachmentInputId,
		checklistGroups,
		checklistDoneCount,
		checklistItemsCount,
		checklistProgress,
		taskDueDelivery,
		taskRestoreLocked,
		showLabelsPanel,
		showChecklistPanel,
		showAttachmentsPanel,
		modalHasLabels,
		modalHasDates,
		modalHasChecklist,
		modalHasAttachments,
		checklistTemplates,
		activeChecklistTemplate,
		selectChecklistTemplate,
		createChecklistForTask,
		addChecklistItemToGroup,
		addOptions,
		detailTabs,
		selectedAnnotationAttachment,
		selectedAnnotationAttachmentUrl,
		selectedAnnotationVersionOptions,
		handoffTemplate,
		displayReviewState,
		reviewTone,
		sourceChatHref,
		renderSourceChatLink,
		reviewLocked,
		canSubmitReview,
		canManagerReview,
		requestReviewLabel,
		submitArtifactVersion,
		submitAnnotation,
		createHandoffChecklist,
	};
};
export type TaskDetailModel = ReturnType<typeof createTaskDetailModel>;
