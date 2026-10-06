'use client';
import { EmptyState } from '@/components/shared/workflow/workflowFields';
import { getApiErrorMessage } from '@/utils/workflow/workflowFormatting';
import { WorkflowPageHero, WorkflowSimpleMetric } from '@/components/shared/workflow/workflowPrimitives';
import type { NotificationItem, NotificationPreference, TaskStatus } from '@/types/designWorkflowTypes';
import { DASHBOARD_CHAT } from '@/utils/routes';
import { runAsyncWithErrorHandler } from '@/utils/runWithCleanup';
import {
	ArrowRight,
	Bell,
	CalendarDays,
	CheckCircle2,
	CircleAlert,
	Clock3,
	FolderKanban,
	ListTodo,
	MessagesSquare,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowNotifications = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'notifications'
		| 'markNotificationRead'
		| 'notificationPreferenceDraft'
		| 'setNotificationPreferenceDraft'
		| 'updateNotificationPreferences'
		| 'onSuccess'
		| 'messageFor'
		| 'onError'
		| 'snoozeForOneHour'
		| 'runNotificationAction'
		| 'notificationCommentDrafts'
		| 'setNotificationCommentDrafts'
		| 'workflow'
		| 'notificationsUnreadOnly'
		| 'setNotificationsUnreadOnly'
		| 'resolvedNotificationPreferences'
		| 'notificationTitle'
		| 'notificationDescription'
		| 'dateTimeFor'
		| 'setSelectedTaskId'
	>;
}) => {
	const {
		notifications,
		markNotificationRead,
		notificationPreferenceDraft,
		setNotificationPreferenceDraft,
		updateNotificationPreferences,
		onSuccess,
		messageFor,
		onError,
		snoozeForOneHour,
		runNotificationAction,
		notificationCommentDrafts,
		setNotificationCommentDrafts,
		workflow,
		notificationsUnreadOnly,
		setNotificationsUnreadOnly,
		resolvedNotificationPreferences,
		notificationTitle,
		notificationDescription,
		dateTimeFor,
		setSelectedTaskId,
	} = model;
	const unreadCount = notifications.filter((item) => !item.is_read).length;
	const taskAlertCount = notifications.filter((item) => item.task).length;
	const chatAlertCount = notifications.filter((item) => item.type === 'chat_message').length;
	const markAllNotificationsRead = () => {
		void Promise.all(notifications.filter((item) => !item.is_read).map((item) => markNotificationRead(item.id)));
	};
	const toneForNotification = (notification: NotificationItem) =>
		notification.type === 'chat_message'
			? 'cyan'
			: notification.task
				? 'green'
				: notification.is_read
					? 'indigo'
					: 'rose';
	const updatePreference = async (key: 'mentions' | 'assignments' | 'review_requests' | 'due_soon', value: boolean) => {
		const previousPreferences = notificationPreferenceDraft;
		const nextPreferences = { ...previousPreferences, [key]: value };
		setNotificationPreferenceDraft(nextPreferences);
		await runAsyncWithErrorHandler(
			async () => {
				const savedPreferences = await updateNotificationPreferences({ [key]: value }).unwrap();
				setNotificationPreferenceDraft(savedPreferences ?? nextPreferences);
				onSuccess(messageFor('Préférences mises à jour.', 'Preferences updated.'));
			},
			(error) => {
				setNotificationPreferenceDraft(previousPreferences);
				onError(
					getApiErrorMessage(
						error,
						messageFor('Impossible de mettre à jour les préférences.', 'Could not update preferences.'),
					),
				);
			},
		);
	};
	const updateDigestFrequency = async (value: NotificationPreference['digest_frequency']) => {
		const previousPreferences = notificationPreferenceDraft;
		const nextPreferences = { ...previousPreferences, digest_frequency: value };
		setNotificationPreferenceDraft(nextPreferences);
		await runAsyncWithErrorHandler(
			async () => {
				const savedPreferences = await updateNotificationPreferences({ digest_frequency: value }).unwrap();
				setNotificationPreferenceDraft(savedPreferences ?? nextPreferences);
				onSuccess(messageFor('Préférences mises à jour.', 'Preferences updated.'));
			},
			(error) => {
				setNotificationPreferenceDraft(previousPreferences);
				onError(
					getApiErrorMessage(
						error,
						messageFor('Impossible de mettre à jour les préférences.', 'Could not update preferences.'),
					),
				);
			},
		);
	};
	const runNotificationTaskAction = (
		notification: NotificationItem,
		action: 'accept_assignment' | 'move_status',
		status?: TaskStatus,
	) => {
		void runNotificationAction({ id: notification.id, action, status });
	};
	const submitNotificationComment = (notification: NotificationItem) => {
		const body = notificationCommentDrafts[notification.id]?.trim();
		if (!body) return;
		void runNotificationAction({ id: notification.id, action: 'comment', body });
		setNotificationCommentDrafts((current) => ({ ...current, [notification.id]: '' }));
	};

	return (
		<div className="workflow-notifications-shell">
			<WorkflowPageHero
				className="workflow-notifications-hero"
				title={workflow.pageTitles.notifications}
				actionsClassName="workflow-notifications-hero-actions"
				actions={
					<>
						<button
							type="button"
							className="workflow-notifications-toggle"
							data-active={notificationsUnreadOnly}
							aria-pressed={notificationsUnreadOnly}
							onClick={() => setNotificationsUnreadOnly(!notificationsUnreadOnly)}
						>
							{notificationsUnreadOnly ? (
								<CheckCircle2 size={16} aria-hidden="true" />
							) : (
								<Bell size={16} aria-hidden="true" />
							)}
							{workflow.labels.unreadOnly}
						</button>
						{unreadCount ? (
							<button type="button" className="workflow-notifications-mark-all" onClick={markAllNotificationsRead}>
								<CheckCircle2 size={15} />
								<span>{workflow.buttons.markAllAsRead}</span>
							</button>
						) : null}
					</>
				}
			/>

			<section className="workflow-notifications-metrics">
				<WorkflowSimpleMetric
					className="workflow-notifications-metric"
					tone="indigo"
					icon={<Bell size={18} />}
					label={workflow.labels.totalAlerts}
					value={notifications.length}
				/>
				<WorkflowSimpleMetric
					className="workflow-notifications-metric"
					tone="rose"
					icon={<CircleAlert size={18} />}
					label={workflow.labels.unread}
					value={unreadCount}
				/>
				<WorkflowSimpleMetric
					className="workflow-notifications-metric"
					tone="green"
					icon={<ListTodo size={18} />}
					label={workflow.labels.taskAlerts}
					value={taskAlertCount}
				/>
				<WorkflowSimpleMetric
					className="workflow-notifications-metric"
					tone="cyan"
					icon={<MessagesSquare size={18} />}
					label={workflow.labels.chatAlerts}
					value={chatAlertCount}
				/>
			</section>

			<section className="workflow-notification-preferences">
				<div>
					<p>{workflow.labels.notificationPreferences ?? 'Notification preferences'}</p>
					<h2>{workflow.labels.digestFrequency ?? 'Digest frequency'}</h2>
				</div>
				<div className="workflow-notification-preference-grid">
					{[
						['mentions', workflow.labels.mentions ?? 'Mentions'],
						['assignments', workflow.labels.assignments ?? 'Assignments'],
						['review_requests', workflow.labels.reviewRequests ?? 'Review requests'],
						['due_soon', workflow.labels.dueSoon ?? 'Due soon'],
					].map(([key, label]) => (
						<label key={key} className="workflow-notification-preference-toggle">
							<input
								type="checkbox"
								checked={Boolean(resolvedNotificationPreferences[key as keyof NotificationPreference])}
								onChange={(event) =>
									void updatePreference(
										key as 'mentions' | 'assignments' | 'review_requests' | 'due_soon',
										event.target.checked,
									)
								}
								suppressHydrationWarning
							/>
							<span>{label}</span>
						</label>
					))}
					<label className="workflow-notification-digest-select">
						<span>{workflow.labels.digestFrequency ?? 'Digest frequency'}</span>
						<select
							value={resolvedNotificationPreferences.digest_frequency}
							onChange={(event) =>
								void updateDigestFrequency(event.target.value as NotificationPreference['digest_frequency'])
							}
						>
							<option value="instant">{workflow.labels.instant ?? 'Instant'}</option>
							<option value="daily">{workflow.labels.daily ?? 'Daily'}</option>
							<option value="weekly">{workflow.labels.weekly ?? 'Weekly'}</option>
							<option value="off">{workflow.labels.off ?? 'Off'}</option>
						</select>
					</label>
				</div>
			</section>

			<section className="workflow-notifications-board">
				<div className="workflow-notifications-board-head">
					<div>
						<p>{workflow.labels.alertFeed}</p>
						<h2>{workflow.sections.notifications.title}</h2>
					</div>
					<span>
						{notifications.length} {workflow.labels.totalAlerts}
					</span>
				</div>
				<div className="workflow-notifications-list">
					{notifications.map((notification: NotificationItem) => {
						const tone = toneForNotification(notification);
						const contextName = notification.task?.project.name ?? notification.project?.name;
						const NotificationIcon =
							notification.type === 'chat_message' ? MessagesSquare : notification.task ? ListTodo : Bell;
						const entityLabel =
							notification.type === 'chat_message'
								? (workflow.labels.notificationChat ?? 'Chat')
								: notification.task
									? (workflow.labels.notificationTask ?? 'Task')
									: notification.project
										? (workflow.labels.notificationProject ?? 'Project')
										: (workflow.labels.notificationWorkflow ?? 'Workflow');
						const chatThreadId =
							typeof notification.payload.thread_id === 'number'
								? notification.payload.thread_id
								: typeof notification.payload.thread_id === 'string'
									? Number(notification.payload.thread_id)
									: 0;
						const chatHref =
							Number.isFinite(chatThreadId) && chatThreadId > 0
								? `${DASHBOARD_CHAT}?thread=${chatThreadId}${Number.isSafeInteger(Number(notification.payload.message_id)) && Number(notification.payload.message_id) > 0 ? `&message=${Number(notification.payload.message_id)}` : ''}`
								: DASHBOARD_CHAT;
						return (
							<article
								key={notification.id}
								className="workflow-notifications-card"
								data-unread={!notification.is_read}
								data-tone={tone}
							>
								<div className="workflow-notifications-card-rail" aria-hidden="true" />
								<div className="workflow-notifications-card-icon" data-tone={tone}>
									<NotificationIcon size={17} />
								</div>
								<div className="workflow-notifications-card-main">
									<div className="workflow-notifications-card-kicker">
										<span className="workflow-notifications-type">{entityLabel}</span>
										<span className="workflow-notifications-read-state" data-unread={!notification.is_read}>
											{notification.is_read ? workflow.labels.read : workflow.labels.unread}
										</span>
									</div>
									<h3>{notificationTitle(notification)}</h3>
									<p>{notificationDescription(notification)}</p>
									<div className="workflow-notifications-meta">
										<span>
											<CalendarDays size={13} />
											{dateTimeFor(notification.created_at)}
										</span>
										{contextName ? (
											<span>
												<FolderKanban size={13} />
												{contextName}
											</span>
										) : null}
										{notification.snoozed_until ? (
											<span>
												<Clock3 size={13} />
												{workflow.labels.snoozedUntil ?? 'Snoozed until'} {dateTimeFor(notification.snoozed_until)}
											</span>
										) : null}
										{notification.action_taken_at ? (
											<span>
												<CheckCircle2 size={13} />
												{workflow.labels.actionTaken ?? 'Action taken'}
											</span>
										) : null}
									</div>
								</div>
								<div className="workflow-notifications-actions">
									{notification.task ? (
										<button
											type="button"
											onClick={() => setSelectedTaskId(notification.task!.id)}
											className="workflow-notifications-action-button"
										>
											<ArrowRight size={16} />
											<span>{workflow.buttons.openTask}</span>
										</button>
									) : null}
									{notification.type === 'chat_message' ? (
										<Link href={chatHref} className="workflow-notifications-action-button">
											<MessagesSquare size={16} />
											<span>{workflow.buttons.openChat}</span>
										</Link>
									) : null}
									{!notification.is_read ? (
										<button
											type="button"
											onClick={() => void markNotificationRead(notification.id)}
											className="workflow-notifications-action-button workflow-notifications-action-primary"
										>
											<CheckCircle2 size={16} />
											<span>{workflow.buttons.markAsRead}</span>
										</button>
									) : null}
									<button
										type="button"
										onClick={() => snoozeForOneHour(notification)}
										className="workflow-notifications-action-button"
									>
										<Clock3 size={16} />
										<span>{workflow.buttons.snooze ?? 'Snooze 1h'}</span>
									</button>
									{notification.task && !notification.action_taken_at ? (
										<>
											<button
												type="button"
												onClick={() => runNotificationTaskAction(notification, 'accept_assignment')}
												className="workflow-notifications-action-button"
											>
												<Users size={16} />
												<span>{workflow.buttons.acceptAssignment ?? 'Accept'}</span>
											</button>
											<button
												type="button"
												onClick={() => runNotificationTaskAction(notification, 'move_status', 'in_progress')}
												className="workflow-notifications-action-button"
											>
												<ArrowRight size={16} />
												<span>{workflow.buttons.moveToProgress ?? 'Move to progress'}</span>
											</button>
										</>
									) : null}
								</div>
								{notification.task && !notification.action_taken_at ? (
									<form
										className="workflow-notifications-comment-action"
										onSubmit={(event) => {
											event.preventDefault();
											submitNotificationComment(notification);
										}}
									>
										<input
											value={notificationCommentDrafts[notification.id] ?? ''}
											onChange={(event) =>
												setNotificationCommentDrafts((current) => ({
													...current,
													[notification.id]: event.target.value,
												}))
											}
											placeholder={workflow.labels.commentPlaceholder ?? 'Write comment'}
											aria-label={workflow.labels.commentPlaceholder ?? 'Write comment'}
										/>
										<button type="submit" disabled={!notificationCommentDrafts[notification.id]?.trim()}>
											<MessagesSquare size={15} />
											<span>{workflow.buttons.postComment ?? 'Post comment'}</span>
										</button>
									</form>
								) : null}
							</article>
						);
					})}
					{notifications.length === 0 ? <EmptyState {...workflow.emptyStates.noNotifications} /> : null}
				</div>
			</section>
		</div>
	);
};
