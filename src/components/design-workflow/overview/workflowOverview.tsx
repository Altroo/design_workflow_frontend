'use client';
import { TaskCardItem } from '@/components/design-workflow/board/workflowCards';
import { AvatarBadge, Chip, EmptyState } from '@/components/shared/workflow/workflowFields';
import { cn, formatMinutes } from '@/utils/workflow/workflowFormatting';
import { BOARD_STATUS_META } from '@/components/shared/workflow/boardAppearance';
import {
	WorkflowMetricCard as MetricCard,
	WorkflowPageHero,
	WorkflowPanelPill,
} from '@/components/shared/workflow/workflowPrimitives';
import { WORKFLOW_CHART_PALETTE } from '@/utils/rawData';
import { DASHBOARD_PROJECT_VIEW } from '@/utils/routes';
import type { ChartData, ChartOptions } from 'chart.js';
import { CircleAlert, Clock3, FolderKanban, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowOverview = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'projects'
		| 'workflow'
		| 'summary'
		| 'chartTextColor'
		| 'labelFor'
		| 'chartSurfaceColor'
		| 'tasks'
		| 'tasksBusy'
		| 'dateFor'
		| 'setSelectedTaskId'
		| 'handleArchiveTask'
		| 'isManager'
		| 'busiestUsers'
		| 'messageFor'
		| 'projectsBusy'
	>;
}) => {
	const {
		projects,
		workflow,
		summary,
		chartTextColor,
		labelFor,
		chartSurfaceColor,
		tasks,
		tasksBusy,
		dateFor,
		setSelectedTaskId,
		handleArchiveTask,
		isManager,
		busiestUsers,
		messageFor,
		projectsBusy,
	} = model;
	const projectPreview = projects.slice(0, 4);
	const metricCards = [
		{
			icon: <FolderKanban size={16} />,
			label: workflow.metrics.activeProjects,
			value: summary?.active_projects ?? 0,
			tone: 'indigo' as const,
		},
		{
			icon: <ListTodo size={16} />,
			label: workflow.metrics.todo,
			value: summary?.todo_tasks ?? 0,
			tone: 'amber' as const,
		},
		{
			icon: <CircleAlert size={16} />,
			label: workflow.metrics.overdueTasks,
			value: summary?.overdue_tasks ?? 0,
			tone: 'rose' as const,
		},
		{
			icon: <Clock3 size={16} />,
			label: workflow.metrics.weekLogged,
			value: formatMinutes(summary?.week_logged_minutes ?? 0),
			tone: 'green' as const,
		},
	];
	const projectLoadRows = [...projects]
		.sort((left, right) => right.open_tasks_count - left.open_tasks_count)
		.slice(0, 6);
	const taskMixValues = [
		summary?.todo_tasks ?? 0,
		summary?.in_progress_tasks ?? 0,
		summary?.in_review_tasks ?? 0,
		summary?.blocked_tasks ?? 0,
		summary?.completed_tasks ?? 0,
	];
	const totalTaskMix = taskMixValues.reduce((sum, value) => sum + value, 0);
	const overviewBarData: ChartData<'bar', number[], string> = {
		labels: projectLoadRows.map((item) => item.name),
		datasets: [
			{
				label: workflow.labels.openTasksLabel,
				data: projectLoadRows.map((item) => item.open_tasks_count),
				backgroundColor: projectLoadRows.map(
					(_, index) => WORKFLOW_CHART_PALETTE[index % WORKFLOW_CHART_PALETTE.length],
				),
				borderRadius: 10,
				borderSkipped: false,
				barThickness: 16,
			},
		],
	};
	const overviewBarOptions: ChartOptions<'bar'> = {
		indexAxis: 'y',
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					label: (context) => `${workflow.labels.openTasksLabel}: ${Number(context.raw) || 0}`,
				},
			},
		},
		scales: {
			x: {
				border: { display: false },
				grid: { color: 'rgba(148, 163, 184, 0.18)' },
				ticks: { color: chartTextColor, precision: 0, font: { weight: 'bold' } },
			},
			y: {
				border: { display: false },
				grid: { display: false },
				ticks: {
					color: chartTextColor,
					font: { weight: 'bold' },
					callback: (value) => `#${Number(value) + 1}`,
				},
			},
		},
	};
	const overviewDoughnutData: ChartData<'doughnut', number[], string> = {
		labels: [labelFor('todo'), labelFor('in_progress'), labelFor('in_review'), labelFor('blocked'), labelFor('done')],
		datasets: [
			{
				data: taskMixValues,
				backgroundColor: [
					BOARD_STATUS_META.todo.accent,
					BOARD_STATUS_META.in_progress.accent,
					BOARD_STATUS_META.in_review.accent,
					BOARD_STATUS_META.blocked.accent,
					BOARD_STATUS_META.done.accent,
				],
				borderColor: chartSurfaceColor,
				borderWidth: 4,
				hoverOffset: 8,
			},
		],
	};
	const overviewDoughnutOptions: ChartOptions<'doughnut'> = {
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		cutout: '66%',
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					boxWidth: 8,
					boxHeight: 8,
					color: chartTextColor,
					font: { weight: 'bold' },
					padding: 12,
					usePointStyle: true,
				},
			},
			tooltip: {
				callbacks: {
					label: (context) => `${context.label}: ${Number(context.raw) || 0}`,
				},
			},
		},
	};

	return (
		<div className="workflow-overview-page">
			<WorkflowPageHero
				className="workflow-overview-header"
				title={workflow.pageTitles.overview}
				actionsClassName="workflow-overview-actions"
				actions={
					<>
						<span>
							{workflow.labels.active} {summary?.active_projects ?? 0}
						</span>
						<span>
							{workflow.labels.blocked} {summary?.blocked_tasks ?? 0}
						</span>
						<span>
							{workflow.labels.overdue} {summary?.overdue_tasks ?? 0}
						</span>
					</>
				}
			/>

			<section className="workflow-overview-metrics">
				{metricCards.map((metric) => (
					<MetricCard key={metric.label} {...metric} />
				))}
			</section>

			<section className="workflow-overview-analytics">
				<article className="workflow-overview-chart-card">
					<WorkflowPanelPill label={workflow.labels.projectLoad} value={projects.length} />
					<div className="workflow-overview-chart-body workflow-overview-chart-body-bar">
						{projectLoadRows.length ? (
							<Bar data={overviewBarData} options={overviewBarOptions} />
						) : (
							<EmptyState {...workflow.emptyStates.noProjects} />
						)}
					</div>
					<div className="workflow-overview-chart-keys">
						{projectLoadRows.map((item, index) => (
							<span key={item.id}>
								<b>#{index + 1}</b>
								{item.name}
							</span>
						))}
					</div>
				</article>
				<article className="workflow-overview-chart-card workflow-overview-chart-card-compact">
					<WorkflowPanelPill label={workflow.labels.deliveryMix} value={totalTaskMix} />
					<div className="workflow-overview-chart-body workflow-overview-chart-body-doughnut">
						{totalTaskMix ? (
							<>
								<Doughnut data={overviewDoughnutData} options={overviewDoughnutOptions} />
								<div className="workflow-overview-doughnut-center" aria-hidden="true">
									<span>{workflow.labels.cards}</span>
									<strong>{totalTaskMix}</strong>
								</div>
							</>
						) : (
							<EmptyState
								title={workflow.labels.noCardsTracked}
								description={workflow.emptyStates.noCards.description}
							/>
						)}
					</div>
				</article>
			</section>

			<section className="workflow-overview-grid">
				<div
					className={cn('workflow-overview-panel', tasks.length > 0 && 'workflow-overview-panel-wide')}
					data-tone="rose"
				>
					<WorkflowPanelPill label={workflow.sections.overdueTasks.title} value={tasks.length} />
					<p className="workflow-overview-panel-copy">{workflow.sections.overdueTasks.description}</p>
					<div className="workflow-overview-task-list">
						{tasksBusy ? <EmptyState {...workflow.emptyStates.loadingCards} /> : null}
						{!tasksBusy &&
							tasks
								.slice(0, 4)
								.map((taskItem) => (
									<TaskCardItem
										key={taskItem.id}
										task={taskItem}
										compact
										copy={workflow}
										labelForAction={labelFor}
										dateForAction={dateFor}
										onOpenAction={setSelectedTaskId}
										onArchiveAction={handleArchiveTask}
										showTime={isManager}
									/>
								))}
						{!tasksBusy && tasks.length === 0 ? <EmptyState {...workflow.emptyStates.noUrgentCards} /> : null}
					</div>
				</div>

				<div className="workflow-overview-panel" data-tone="indigo">
					<WorkflowPanelPill label={workflow.sections.capacitySnapshot.title} value={busiestUsers.length} />
					<p className="workflow-overview-panel-copy">{workflow.sections.capacitySnapshot.description}</p>
					<div className="workflow-overview-people">
						{busiestUsers.map((row) => (
							<div key={row.user.id} className="workflow-overview-person">
								<AvatarBadge user={row.user} size={34} />
								<div className="min-w-0 flex-1">
									<p>
										{row.user.first_name} {row.user.last_name}
									</p>
									<span>
										{row.user.role === 'manager'
											? labelFor(row.user.role)
											: messageFor("Membre de l'équipe", 'Team member')}
									</span>
								</div>
								<div className="flex flex-wrap justify-end gap-2">
									<Chip>
										{row.open_tasks} {workflow.labels.openLower} • {row.overdue_tasks} {workflow.labels.overdueLower}
									</Chip>
								</div>
							</div>
						))}
						{busiestUsers.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkload} /> : null}
					</div>
				</div>

				<div className="workflow-overview-panel" data-tone="green">
					<WorkflowPanelPill label={workflow.sections.projects.title} value={projectPreview.length} />
					<p className="workflow-overview-panel-copy">{workflow.sections.projects.description}</p>
					<div className="workflow-overview-projects">
						{projectsBusy ? <EmptyState {...workflow.emptyStates.loadingProjects} /> : null}
						{!projectsBusy &&
							projectPreview.map((projectItem) => (
								<Link
									key={projectItem.id}
									href={DASHBOARD_PROJECT_VIEW(projectItem.id)}
									className="workflow-overview-project"
								>
									<div>
										<p>{projectItem.name}</p>
										<span>
											{projectItem.open_tasks_count} {workflow.labels.openTasks}
										</span>
									</div>
									<Chip status={projectItem.status}>{labelFor(projectItem.status)}</Chip>
								</Link>
							))}
						{!projectsBusy && projectPreview.length === 0 ? <EmptyState {...workflow.emptyStates.noProjects} /> : null}
					</div>
				</div>
			</section>
		</div>
	);
};
