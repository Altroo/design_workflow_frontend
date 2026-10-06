'use client';
import { AvatarBadge, Chip, EmptyState } from '@/components/shared/workflow/workflowFields';
import { formatMinutes, formatWorkDays } from '@/utils/workflow/workflowFormatting';
import { WORKFLOW_AVATAR_SIZES } from '@/components/shared/workflow/workflowAvatar';
import {
	WorkflowMetricCard as MetricCard,
	WorkflowPageHero,
	WorkflowPanelPill,
} from '@/components/shared/workflow/workflowPrimitives';
import type { WorkloadRow } from '@/types/designWorkflowTypes';
import type { ChartData, ChartOptions } from 'chart.js';
import { CircleAlert, Clock3, ListTodo, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Bar } from 'react-chartjs-2';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
const TEAM_PERSON_AVATAR_SIZE = WORKFLOW_AVATAR_SIZES.team;
export const WorkflowTeam = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		'designerWorkload' | 'workflow' | 'chartTextColor' | 'isUserOnline' | 'labelFor' | 'messageFor'
	>;
}) => {
	const { designerWorkload, workflow, chartTextColor, isUserOnline, labelFor, messageFor } = model;
	const totalOpenTasks = designerWorkload.reduce((sum, row) => sum + row.open_tasks, 0);
	const totalOverdueTasks = designerWorkload.reduce((sum, row) => sum + row.overdue_tasks, 0);
	const totalEstimatedMinutes = designerWorkload.reduce((sum, row) => sum + row.estimated_minutes, 0);
	const totalActualMinutes = designerWorkload.reduce((sum, row) => sum + row.actual_minutes, 0);
	const maxOpenTasks = Math.max(1, ...designerWorkload.map((row) => row.open_tasks));
	const maxEstimatedMinutes = Math.max(1, ...designerWorkload.map((row) => row.estimated_minutes));
	const leadUser = [...designerWorkload].sort(
		(left, right) => right.open_tasks - left.open_tasks || right.overdue_tasks - left.overdue_tasks,
	)[0];
	const chartRows = [...designerWorkload]
		.sort((left, right) => right.estimated_minutes - left.estimated_minutes || right.open_tasks - left.open_tasks)
		.slice(0, 8);
	const teamChartHeight = Math.min(480, Math.max(280, chartRows.length * 68 + 110));
	const teamBarData: ChartData<'bar', number[], string> = {
		labels: chartRows.map((row) => `${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email),
		datasets: [
			{
				label: workflow.labels.estimatedLoad,
				data: chartRows.map((row) => row.estimated_minutes),
				backgroundColor: '#4f46e5',
				borderRadius: 10,
				borderSkipped: false,
				barThickness: 11,
				barPercentage: 0.74,
				categoryPercentage: 0.64,
			},
			{
				label: workflow.labels.logged,
				data: chartRows.map((row) => row.actual_minutes),
				backgroundColor: '#0891b2',
				borderRadius: 10,
				borderSkipped: false,
				barThickness: 11,
				barPercentage: 0.74,
				categoryPercentage: 0.64,
			},
		],
	};
	const teamBarOptions: ChartOptions<'bar'> = {
		indexAxis: 'y',
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					boxWidth: 7,
					boxHeight: 7,
					color: chartTextColor,
					font: { size: 11, weight: 'bold' },
					padding: 8,
					usePointStyle: true,
				},
			},
			tooltip: {
				callbacks: {
					label: (context) =>
						`${context.dataset.label}: ${formatWorkDays(Number(context.raw) || 0, workflow.labels.daysUnit)}`,
				},
			},
		},
		scales: {
			x: {
				border: { display: false },
				grid: { color: 'rgba(148, 163, 184, 0.18)' },
				ticks: {
					color: chartTextColor,
					font: { weight: 'bold' },
					autoSkip: true,
					maxRotation: 0,
					maxTicksLimit: 4,
					minRotation: 0,
					callback: (value) => formatWorkDays(Number(value) || 0, workflow.labels.daysUnit),
				},
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
	const pressureRows = designerWorkload
		.filter((row) => row.overdue_tasks > 0 || row.open_tasks >= Math.max(4, Math.ceil(maxOpenTasks * 0.75)))
		.sort((left, right) => right.overdue_tasks - left.overdue_tasks || right.open_tasks - left.open_tasks)
		.slice(0, 4);
	const calmRows = designerWorkload
		.filter((row) => row.overdue_tasks === 0)
		.sort((left, right) => left.open_tasks - right.open_tasks)
		.slice(0, 4);
	const hasTeamWorkloadSignal = designerWorkload.some(
		(row) => row.open_tasks > 0 || row.overdue_tasks > 0 || row.estimated_minutes > 0 || row.actual_minutes > 0,
	);

	return (
		<div className="workflow-team-page">
			<WorkflowPageHero
				className="workflow-team-header"
				title={workflow.pageTitles.team}
				actionsClassName="workflow-team-header-actions"
				actions={
					<>
						<span>
							{workflow.labels.contributors} {designerWorkload.length}
						</span>
						<span>
							{workflow.labels.open} {totalOpenTasks}
						</span>
						<span>
							{workflow.labels.overdue} {totalOverdueTasks}
						</span>
					</>
				}
			/>

			<section className="workflow-team-metrics">
				<MetricCard
					icon={<Users size={16} />}
					label={workflow.labels.teamMembers ?? 'Team members'}
					value={designerWorkload.length}
					tone="indigo"
				/>
				<MetricCard
					icon={<ListTodo size={16} />}
					label={workflow.labels.openTasksLabel ?? 'Open tasks'}
					value={totalOpenTasks}
					tone="amber"
				/>
				<MetricCard
					icon={<CircleAlert size={16} />}
					label={workflow.labels.overdueTasksLabel ?? 'Overdue tasks'}
					value={totalOverdueTasks}
					tone="rose"
				/>
				<MetricCard
					icon={<Clock3 size={16} />}
					label={workflow.labels.estimatedLoad ?? 'Estimated load'}
					value={formatWorkDays(totalEstimatedMinutes, workflow.labels.daysUnit)}
					tone="green"
				/>
			</section>

			<section className="workflow-team-grid">
				{designerWorkload.length ? (
					<section className="workflow-team-analytics">
						<WorkflowPanelPill
							baseClassName="workflow-team-panel-pill"
							label={workflow.labels.teamLoadMap}
							value={`${formatMinutes(totalActualMinutes)} ${workflow.labels.loggedSuffix}`}
							labelElement="span"
						/>
						{hasTeamWorkloadSignal ? (
							<>
								<div
									className="workflow-team-chart-body"
									style={{ '--workflow-team-chart-height': `${teamChartHeight}px` } as CSSProperties}
								>
									<Bar data={teamBarData} options={teamBarOptions} />
								</div>
								<div className="workflow-team-chart-keys">
									{chartRows.map((row, index) => (
										<span key={row.user.id}>
											<b>#{index + 1}</b>
											{`${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email}
										</span>
									))}
								</div>
							</>
						) : (
							<EmptyState {...workflow.emptyStates.noWorkloadData} icon={<Users size={18} />} />
						)}
					</section>
				) : null}
				<div className="workflow-team-board">
					<WorkflowPanelPill
						baseClassName="workflow-team-panel-pill"
						label={workflow.sections.teamWorkload.title}
						value={`${formatMinutes(totalActualMinutes)} ${workflow.labels.loggedSuffix}`}
						labelElement="span"
					/>
					<div className="workflow-team-card-grid">
						{designerWorkload.map((row: WorkloadRow) => {
							const loadPercent = Math.min(100, Math.round((row.open_tasks / maxOpenTasks) * 100));
							const estimatePercent = Math.min(100, Math.round((row.estimated_minutes / maxEstimatedMinutes) * 100));
							const tone =
								row.overdue_tasks > 0
									? 'danger'
									: row.open_tasks >= maxOpenTasks && maxOpenTasks > 1
										? 'heavy'
										: 'calm';
							const online = isUserOnline(row.user.id);
							return (
								<article
									key={row.user.id}
									className="workflow-team-card"
									data-tone={tone}
									style={
										{ '--team-load': `${loadPercent}%`, '--team-estimate': `${estimatePercent}%` } as CSSProperties
									}
								>
									<div className="workflow-team-card-head">
										<div className="workflow-team-person">
											<AvatarBadge user={row.user} size={TEAM_PERSON_AVATAR_SIZE} />
											<div className="min-w-0">
												<h3>
													{row.user.first_name} {row.user.last_name}
												</h3>
												<p>
													{row.user.role === 'manager'
														? labelFor(row.user.role)
														: messageFor("Membre de l'équipe", 'Team member')}
												</p>
											</div>
										</div>
										<div className="workflow-team-status-chips">
											<Chip tone={online ? 'progress' : 'neutral'}>
												{online ? workflow.labels.online : workflow.labels.offline}
											</Chip>
											<Chip tone={row.overdue_tasks > 0 ? 'urgent' : 'neutral'}>
												{row.overdue_tasks > 0 ? workflow.labels.highPressure : workflow.labels.balanced}
											</Chip>
										</div>
									</div>
									<div className="workflow-team-bars">
										<div>
											<span>{workflow.labels.openTasksLabel}</span>
											<b>{row.open_tasks}</b>
										</div>
										<div className="workflow-team-load-track">
											<span />
										</div>
										<div>
											<span>{workflow.labels.estimatedLoad}</span>
											<b>{formatWorkDays(row.estimated_minutes, workflow.labels.daysUnit)}</b>
										</div>
										<div className="workflow-team-estimate-track">
											<span />
										</div>
									</div>
									<div className="workflow-team-card-footer">
										<span>
											<CircleAlert size={13} /> {row.overdue_tasks} {workflow.labels.overdueLower}
										</span>
										<span>
											<Clock3 size={13} /> {formatMinutes(row.actual_minutes)}
										</span>
									</div>
								</article>
							);
						})}
						{designerWorkload.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkloadData} /> : null}
					</div>
				</div>

				<aside className="workflow-team-side">
					<div className="workflow-team-spotlight">
						<WorkflowPanelPill
							baseClassName="workflow-team-panel-pill"
							label={workflow.labels.teamFocus}
							value={leadUser ? `${leadUser.open_tasks} ${workflow.labels.openLower}` : '0'}
							labelElement="span"
						/>
						{leadUser ? (
							<>
								<div className="workflow-team-spotlight-body">
									<AvatarBadge user={leadUser.user} size={TEAM_PERSON_AVATAR_SIZE} />
									<div className="min-w-0">
										<h3>
											{leadUser.user.first_name} {leadUser.user.last_name}
										</h3>
										<p>
											{leadUser.user.role === 'manager'
												? labelFor(leadUser.user.role)
												: messageFor("Membre de l'équipe", 'Team member')}
										</p>
									</div>
								</div>
								<div className="workflow-team-spotlight-stats">
									<span>
										<b>{leadUser.open_tasks}</b>
										{workflow.labels.openTasksLabel}
									</span>
									<span>
										<b>{leadUser.overdue_tasks}</b>
										{workflow.labels.overdueTasksLabel}
									</span>
									<span>
										<b>{formatWorkDays(leadUser.estimated_minutes, workflow.labels.daysUnit)}</b>
										{workflow.labels.estimatedLoad}
									</span>
								</div>
							</>
						) : (
							<EmptyState {...workflow.emptyStates.noWorkloadData} />
						)}
					</div>

					<div className="workflow-team-lane">
						<WorkflowPanelPill
							baseClassName="workflow-team-panel-pill"
							className="workflow-team-panel-pill-rose"
							label={workflow.labels.attentionLane}
							value={pressureRows.length}
							labelElement="span"
						/>
						{pressureRows.map((row) => (
							<div key={row.user.id} className="workflow-team-mini-row">
								<AvatarBadge user={row.user} size={TEAM_PERSON_AVATAR_SIZE} />
								<div>
									<p>
										{row.user.first_name} {row.user.last_name}
									</p>
									<span>
										{row.open_tasks} {workflow.labels.openLower} - {row.overdue_tasks} {workflow.labels.overdueLower}
									</span>
								</div>
							</div>
						))}
						{pressureRows.length === 0 ? (
							<div className="workflow-team-empty-line">{workflow.labels.noPressure}</div>
						) : null}
					</div>

					<div className="workflow-team-lane">
						<WorkflowPanelPill
							baseClassName="workflow-team-panel-pill"
							className="workflow-team-panel-pill-green"
							label={workflow.labels.availableLane}
							value={calmRows.length}
							labelElement="span"
						/>
						{calmRows.map((row) => (
							<div key={row.user.id} className="workflow-team-mini-row">
								<AvatarBadge user={row.user} size={TEAM_PERSON_AVATAR_SIZE} />
								<div>
									<p>
										{row.user.first_name} {row.user.last_name}
									</p>
									<span>
										{row.open_tasks} {workflow.labels.openLower} -{' '}
										{formatWorkDays(row.estimated_minutes, workflow.labels.daysUnit)}
									</span>
								</div>
							</div>
						))}
						{calmRows.length === 0 ? (
							<div className="workflow-team-empty-line">{workflow.labels.noAvailableLane}</div>
						) : null}
					</div>
				</aside>
			</section>
		</div>
	);
};
