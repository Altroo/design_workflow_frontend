'use client';
import { AvatarBadge, Chip, EmptyState, FieldLabel } from '@/components/shared/workflow/workflowFields';
import { formatMinutes } from '@/utils/workflow/workflowFormatting';
import { downloadCsv, formatExportDateTime, openPrintableReport } from '@/utils/workflow/workflowReportExport';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import {
	WorkflowDateField as DateField,
	WorkflowSelectField as SelectField,
} from '@/components/shared/workflow/workflowFormControls';
import { WorkflowPageHero, WorkflowSimpleMetric } from '@/components/shared/workflow/workflowPrimitives';
import type { TimeReportRow, WorkflowAnalyticsReport } from '@/types/designWorkflowTypes';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';
import { useIsClient, useToast } from '@/utils/hooks';
import { WORKFLOW_CHART_PALETTE } from '@/utils/rawData';
import type { ChartData, ChartOptions } from 'chart.js';
import {
	BriefcaseBusiness,
	CalendarDays,
	Clock3,
	FileText,
	FolderKanban,
	RefreshCcw,
	Save,
	ShieldCheck,
	Table2,
	Users,
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowReport = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'timeReport'
		| 'workflow'
		| 'chartTextColor'
		| 'chartSurfaceColor'
		| 'reportFilters'
		| 'projects'
		| 'assignableUsers'
		| 'userOptionLabel'
		| 'workflowReport'
		| 'locale'
		| 't'
		| 'messageFor'
		| 'labelFor'
		| 'riskLabelFor'
		| 'setReportFilters'
	>;
}) => {
	const { onError } = useToast();
	const reportChartsMounted = useIsClient();
	const {
		timeReport,
		workflow,
		chartTextColor,
		chartSurfaceColor,
		reportFilters,
		projects,
		assignableUsers,
		userOptionLabel,
		workflowReport,
		locale,
		t,
		messageFor,
		labelFor,
		riskLabelFor,
		setReportFilters,
	} = model;
	const totalMinutes = timeReport.reduce((sum, row) => sum + row.minutes, 0);
	const sortedReport = [...timeReport].sort((left, right) => right.minutes - left.minutes);
	const topRow = sortedReport[0];
	const maxMinutes = Math.max(...timeReport.map((row) => row.minutes), 1);
	const averageMinutes = timeReport.length ? Math.round(totalMinutes / timeReport.length) : 0;
	const chartRows = sortedReport.slice(0, 8);
	const topDistributionRows = sortedReport.slice(0, 5);
	const otherMinutes = sortedReport.slice(5).reduce((sum, row) => sum + row.minutes, 0);
	const topSharePercent = totalMinutes && topRow ? Math.round((topRow.minutes / totalMinutes) * 100) : 0;
	const remainingProjectCount = Math.max(0, timeReport.length - topDistributionRows.length);
	const reportBarHeight = Math.min(430, Math.max(260, chartRows.length * 44 + 150));
	const reportPalette = WORKFLOW_CHART_PALETTE;
	const reportBarData: ChartData<'bar', number[], string> = {
		labels: chartRows.map((row) => row.project.name),
		datasets: [
			{
				label: workflow.labels.trackedTime,
				data: chartRows.map((row) => row.minutes),
				backgroundColor: chartRows.map((_, index) => reportPalette[index % reportPalette.length]),
				borderRadius: 12,
				borderSkipped: false,
				barThickness: 18,
			},
		],
	};
	const reportBarOptions: ChartOptions<'bar'> = {
		indexAxis: 'y',
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					label: (context) => `${workflow.labels.trackedTime}: ${formatMinutes(Number(context.raw) || 0)}`,
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
					callback: (value) => formatMinutes(Number(value) || 0),
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
	const doughnutLabels = [
		...topDistributionRows.map((row) => row.project.name),
		...(otherMinutes > 0 ? [workflow.labels.otherProjects] : []),
	];
	const doughnutValues = [
		...topDistributionRows.map((row) => row.minutes),
		...(otherMinutes > 0 ? [otherMinutes] : []),
	];
	const reportDoughnutData: ChartData<'doughnut', number[], string> = {
		labels: doughnutLabels,
		datasets: [
			{
				data: doughnutValues,
				backgroundColor: doughnutValues.map((_, index) => reportPalette[index % reportPalette.length]),
				borderColor: chartSurfaceColor,
				borderWidth: 4,
				hoverOffset: 8,
			},
		],
	};
	const reportDoughnutOptions: ChartOptions<'doughnut'> = {
		responsive: true,
		maintainAspectRatio: false,
		cutout: '66%',
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					boxWidth: 8,
					boxHeight: 8,
					color: chartTextColor,
					font: { weight: 'bold' },
					padding: 14,
					usePointStyle: true,
				},
			},
			tooltip: {
				callbacks: {
					label: (context) => `${context.label}: ${formatMinutes(Number(context.raw) || 0)}`,
				},
			},
		},
	};
	const reportCurveData: ChartData<'line', number[], string> = {
		labels: chartRows.map((_, index) => `#${index + 1}`),
		datasets: [
			{
				label: workflow.labels.effortCurve,
				data: chartRows.map((row) => row.minutes),
				borderColor: '#4f46e5',
				backgroundColor: 'rgba(79, 70, 229, 0.08)',
				fill: true,
				pointBackgroundColor: '#4f46e5',
				pointBorderColor: chartSurfaceColor,
				pointBorderWidth: 3,
				pointRadius: 5,
				tension: 0.42,
			},
		],
	};
	const reportCurveOptions: ChartOptions<'line'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					label: (context) => `${workflow.labels.trackedTime}: ${formatMinutes(Number(context.raw) || 0)}`,
				},
			},
		},
		scales: {
			x: {
				border: { display: false },
				grid: { display: false },
				ticks: { color: chartTextColor, font: { weight: 'bold' } },
			},
			y: {
				border: { display: false },
				grid: { color: 'rgba(148, 163, 184, 0.16)' },
				ticks: {
					color: chartTextColor,
					font: { weight: 'bold' },
					autoSkip: true,
					maxRotation: 0,
					maxTicksLimit: 5,
					minRotation: 0,
					callback: (value) => formatMinutes(Number(value) || 0),
				},
			},
		},
	};
	const dateWindow =
		reportFilters.start_date || reportFilters.end_date
			? `${reportFilters.start_date || workflow.labels.noDate} - ${reportFilters.end_date || workflow.labels.noDate}`
			: workflow.labels.allTimeWindow;
	const selectedReportProject = projects.find((item) => String(item.id) === reportFilters.project);
	const selectedReportUser = assignableUsers.find((item) => String(item.id) === reportFilters.user);
	const selectedProjectName = selectedReportProject?.name ?? '';
	const selectedUserName = selectedReportUser ? userOptionLabel(selectedReportUser) : '';
	const selectedScopeLabel = [selectedProjectName, selectedUserName].filter(Boolean).join(' - ');
	const reportScopeLabel = selectedScopeLabel || workflow.labels.allProjects;
	const generatedAt = workflowReport?.generated_at ?? new Date().toISOString();
	const generatedLabel = formatExportDateTime(generatedAt, locale);
	const reportFileDate = new Date(generatedAt).toISOString().slice(0, 10);
	const printableReportCopy: PrintableReportCopy = {
		brand: t.navigation.productName,
		reportStudio: workflow.labels.reportStudio,
		title: workflow.labels.reportExportTitle,
		issuedBy: workflow.labels.reportIssuedBy,
		generatedOn: workflow.labels.reportGeneratedOn,
		period: workflow.labels.reportPeriod,
		scope: workflow.labels.reportScope,
		allProjects: workflow.labels.allProjects,
		summary: workflow.labels.reportSummary,
		projectsIncluded: workflow.labels.projectsIncluded,
		trackedTime: workflow.labels.trackedTime,
		leadTime: workflow.labels.leadTime,
		cycleTime: workflow.labels.cycleTime,
		blockedTime: workflow.labels.blockedTime,
		blockedTasks: workflow.labels.blockedTasks,
		projectTime: workflow.labels.timeByProject,
		project: workflow.labels.project,
		manager: workflow.labels.manager,
		status: workflow.labels.status,
		priority: workflow.labels.priority,
		minutes: workflow.labels.minutesUnit,
		hours: workflow.labels.hoursUnit,
		share: workflow.labels.reportShare,
		deliveryFlow: workflow.labels.deliveryFlow,
		reviewBottlenecks: workflow.labels.reviewBottlenecks,
		estimateVsActual: workflow.labels.estimateVsActual,
		statusDistribution: workflow.labels.statusDistribution,
		tasksSampled: workflow.labels.tasksSampled,
		needsReview: workflow.labels.needsReview,
		changesRequested: workflow.labels.changesRequested,
		approved: workflow.labels.approved,
		pendingReviewMinutes: workflow.labels.pendingReviewMinutes,
		estimatedMinutes: workflow.labels.estimatedMinutesMetric,
		actualMinutes: workflow.labels.actualMinutes,
		varianceMinutes: workflow.labels.varianceMinutes,
		designerForecast: workflow.labels.designerForecast,
		designer: messageFor('Membre', 'Member'),
		openTasks: workflow.labels.openTasksLabel,
		overdueTasks: workflow.labels.overdueTasksLabel,
		remainingMinutes: workflow.labels.remainingMinutes,
		loadPercent: workflow.labels.loadPercent,
		forecastDays: workflow.labels.forecastDays,
		risk: workflow.labels.risk,
		designersIncluded: workflow.labels.designersIncluded,
		page: workflow.labels.reportPage,
		noProjectTimeWindow: workflow.labels.noProjectTimeWindow,
		noForecastRows: workflow.labels.noForecastRows,
	};
	const exportMetadataRows: Array<Array<string | number | null | undefined>> = [
		[printableReportCopy.title],
		[printableReportCopy.generatedOn, generatedLabel],
		[printableReportCopy.period, dateWindow],
		[printableReportCopy.scope, reportScopeLabel],
		[],
	];
	const exportTimeReport = () => {
		downloadCsv(`flux-design-time-report-${reportFileDate}.csv`, [
			...exportMetadataRows,
			[printableReportCopy.summary],
			[workflow.labels.metric, t.common.value, workflow.labels.reportUnit],
			[workflow.labels.trackedTime, totalMinutes, workflow.labels.minutesUnit],
			[workflow.labels.activeReportProjects, timeReport.length, workflow.labels.projectsIncluded],
			[workflow.labels.averagePerProject, averageMinutes, workflow.labels.minutesUnit],
			[workflow.labels.topProject, topRow?.project.name ?? workflow.labels.noReportProject, ''],
			[],
			[workflow.labels.timeByProject],
			[
				workflow.labels.project,
				workflow.labels.manager,
				workflow.labels.status,
				workflow.labels.priority,
				workflow.labels.minutesUnit,
				workflow.labels.hoursUnit,
				workflow.labels.reportShare,
			],
			...sortedReport.map((row) => [
				row.project.name,
				`${row.project.manager.first_name} ${row.project.manager.last_name}`.trim() || row.project.manager.email,
				labelFor(row.project.status),
				labelFor(row.project.priority),
				row.minutes,
				(row.minutes / 60).toFixed(2),
				totalMinutes ? `${Math.round((row.minutes / totalMinutes) * 100)}%` : '0%',
			]),
		]);
	};
	const exportWorkflowReport = (report?: WorkflowAnalyticsReport) => {
		if (!report) return;
		downloadCsv(`flux-design-analytics-report-${reportFileDate}.csv`, [
			...exportMetadataRows,
			[workflow.labels.deliveryFlow],
			[workflow.labels.metric, t.common.value, workflow.labels.reportUnit],
			[workflow.labels.tasksSampled, report.tasks_sampled],
			[workflow.labels.leadTimeDays, report.lead_time_days, workflow.labels.daysUnit],
			[workflow.labels.cycleTimeDays, report.cycle_time_days, workflow.labels.daysUnit],
			[workflow.labels.blockedTasks, report.blocked_tasks],
			[workflow.labels.blockedTimeMinutes, report.blocked_time_minutes, workflow.labels.minutesUnit],
			[],
			[workflow.labels.reviewBottlenecks],
			[workflow.labels.metric, t.common.value, workflow.labels.reportUnit],
			[workflow.labels.needsReview, report.review_bottlenecks.needs_review],
			[workflow.labels.changesRequested, report.review_bottlenecks.changes_requested],
			[workflow.labels.approved, report.review_bottlenecks.approved],
			[workflow.labels.pendingReviewMinutes, report.review_bottlenecks.pending_review_minutes],
			[
				workflow.labels.averageReviewWait,
				report.review_bottlenecks.average_pending_review_minutes,
				workflow.labels.minutesUnit,
			],
			[],
			[workflow.labels.estimateVsActual],
			[workflow.labels.metric, t.common.value, workflow.labels.reportUnit],
			[workflow.labels.estimatedMinutesMetric, report.estimate_vs_actual.estimated_minutes],
			[workflow.labels.actualMinutes, report.estimate_vs_actual.actual_minutes],
			[workflow.labels.varianceMinutes, report.estimate_vs_actual.variance_minutes],
			[workflow.labels.actualRatio, report.estimate_vs_actual.actual_to_estimate_ratio],
			[],
			[workflow.labels.statusDistribution],
			[workflow.labels.status, workflow.labels.tasksSampled],
			...STATUS_COLUMNS.map((status) => [labelFor(status), report.status_counts[status] ?? 0]),
			[],
			[workflow.labels.designerForecast],
			[
				messageFor('Membre', 'Member'),
				workflow.labels.openTasksLabel,
				workflow.labels.overdueTasksLabel,
				workflow.labels.remainingMinutes,
				workflow.labels.loadPercent,
				workflow.labels.forecastDays,
				workflow.labels.risk,
			],
			...report.designer_forecast.map((row) => [
				`${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email,
				row.open_tasks,
				row.overdue_tasks,
				row.remaining_minutes,
				row.load_percent,
				row.forecast_days,
				riskLabelFor(row.risk),
			]),
		]);
	};
	const exportPrintableReport = () => {
		void openPrintableReport({
			dateWindow,
			scopeLabel: reportScopeLabel,
			generatedAt,
			locale,
			totalMinutes,
			timeReport: sortedReport,
			workflowReport,
			copy: printableReportCopy,
			labelFor,
			riskLabelFor,
		}).catch(() =>
			onError(
				messageFor(
					'Impossible d’ouvrir le rapport. Autorisez les fenêtres contextuelles puis réessayez.',
					'Could not open the report. Allow pop-ups and try again.',
				),
			),
		);
	};
	const reviewBottlenecks = workflowReport?.review_bottlenecks;
	const estimateVsActual = workflowReport?.estimate_vs_actual;
	const forecastRows = workflowReport?.designer_forecast ?? [];
	const statusRows = workflowReport
		? STATUS_COLUMNS.map((statusValue) => ({
				status: statusValue,
				count: workflowReport.status_counts[statusValue] ?? 0,
			}))
		: [];
	const renderChartPlaceholder = () => <div className="workflow-report-chart-placeholder" aria-hidden="true" />;

	return (
		<div className="workflow-report-shell">
			<WorkflowPageHero
				className="workflow-report-hero"
				title={workflow.pageTitles['report-time']}
				actionsWrapper={false}
				actions={
					<div className="workflow-report-window">
						<CalendarDays size={18} />
						<span>{dateWindow}</span>
					</div>
				}
			/>

			<section className="workflow-report-filterbar">
				<div className="workflow-report-date-fields">
					<div>
						<FieldLabel htmlFor="workflow-report-start-date">{workflow.labels.startDate}</FieldLabel>
						<DateField
							id="workflow-report-start-date"
							value={reportFilters.start_date}
							onChangeAction={(value) => setReportFilters((current) => ({ ...current, start_date: value }))}
						/>
					</div>
					<div>
						<FieldLabel htmlFor="workflow-report-end-date">{workflow.labels.endDate}</FieldLabel>
						<DateField
							id="workflow-report-end-date"
							value={reportFilters.end_date}
							onChangeAction={(value) => setReportFilters((current) => ({ ...current, end_date: value }))}
						/>
					</div>
					<div>
						<FieldLabel htmlFor="workflow-report-project">{workflow.labels.project}</FieldLabel>
						<SelectField
							id="workflow-report-project"
							value={reportFilters.project}
							onChangeAction={(value) => setReportFilters((current) => ({ ...current, project: value }))}
							options={[
								{ value: '', label: workflow.labels.allProjects },
								...projects.map((item) => ({ value: item.id, label: item.name })),
							]}
							startIcon={<FolderKanban size={16} />}
						/>
					</div>
					<div>
						<FieldLabel htmlFor="workflow-report-user">{workflow.labels.assignee}</FieldLabel>
						<SelectField
							id="workflow-report-user"
							value={reportFilters.user}
							onChangeAction={(value) => setReportFilters((current) => ({ ...current, user: value }))}
							options={[
								{ value: '', label: workflow.labels.allAssignees },
								...assignableUsers.map((item) => ({ value: item.id, label: userOptionLabel(item) })),
							]}
							startIcon={<Users size={16} />}
						/>
					</div>
				</div>
				<div className="workflow-report-actions">
					<button
						type="button"
						onClick={() => setReportFilters({ start_date: '', end_date: '', project: '', user: '' })}
						className="workflow-report-clear"
					>
						<RefreshCcw size={15} />
						<span>{workflow.buttons.clearFilters}</span>
					</button>
					<button
						type="button"
						onClick={exportTimeReport}
						className="workflow-report-clear workflow-report-export"
						disabled={timeReport.length === 0}
					>
						<Save size={15} />
						<span>{workflow.buttons.exportCsv ?? 'Export CSV'}</span>
					</button>
					<button
						type="button"
						onClick={() => exportWorkflowReport(workflowReport)}
						className="workflow-report-clear workflow-report-export"
						disabled={!workflowReport}
					>
						<Table2 size={15} />
						<span>{workflow.buttons.exportAnalyticsCsv ?? 'Export analytics'}</span>
					</button>
					<button
						type="button"
						onClick={exportPrintableReport}
						className="workflow-report-clear workflow-report-export"
					>
						<FileText size={15} />
						<span>{workflow.buttons.exportPdf ?? 'Export PDF'}</span>
					</button>
				</div>
			</section>

			<section className="workflow-report-metrics">
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-dark"
					icon={<Clock3 size={18} />}
					label={workflow.labels.trackedTime}
					value={formatMinutes(totalMinutes)}
				/>
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-cyan"
					icon={<FolderKanban size={18} />}
					label={workflow.labels.activeReportProjects}
					value={timeReport.length}
				/>
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-green"
					icon={<BriefcaseBusiness size={18} />}
					label={workflow.labels.averagePerProject}
					value={formatMinutes(averageMinutes)}
				/>
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-rose"
					icon={<ShieldCheck size={18} />}
					label={workflow.labels.topProject}
					value={topRow ? topRow.project.name : workflow.labels.noReportProject}
				/>
			</section>

			{workflowReport ? (
				<section className="workflow-analytics-grid">
					<article className="workflow-analytics-panel workflow-analytics-panel-strong">
						<div className="workflow-analytics-panel-head">
							<p>{workflow.labels.deliveryFlow ?? 'Delivery flow'}</p>
							<h2>{workflow.labels.leadCycleTime ?? 'Lead and cycle time'}</h2>
						</div>
						<div className="workflow-analytics-kpis">
							<div>
								<span>{workflow.labels.leadTime ?? 'Lead time'}</span>
								<strong>{workflowReport.lead_time_days}d</strong>
							</div>
							<div>
								<span>{workflow.labels.cycleTime ?? 'Cycle time'}</span>
								<strong>{workflowReport.cycle_time_days}d</strong>
							</div>
							<div>
								<span>{workflow.labels.blockedTime ?? 'Blocked time'}</span>
								<strong>{formatMinutes(workflowReport.blocked_time_minutes)}</strong>
							</div>
							<div>
								<span>{workflow.labels.blockedTasks ?? 'Blocked tasks'}</span>
								<strong>{workflowReport.blocked_tasks}</strong>
							</div>
						</div>
					</article>

					<article className="workflow-analytics-panel">
						<div className="workflow-analytics-panel-head">
							<p>{workflow.labels.reviewBottlenecks ?? 'Review bottlenecks'}</p>
							<h2>{formatMinutes(reviewBottlenecks?.pending_review_minutes ?? 0)}</h2>
						</div>
						<div className="workflow-analytics-stack">
							<span>
								{workflow.labels.needsReview ?? 'Needs review'} <b>{reviewBottlenecks?.needs_review ?? 0}</b>
							</span>
							<span>
								{workflow.labels.changesRequested ?? 'Changes requested'}{' '}
								<b>{reviewBottlenecks?.changes_requested ?? 0}</b>
							</span>
							<span>
								{workflow.labels.approved ?? 'Approved'} <b>{reviewBottlenecks?.approved ?? 0}</b>
							</span>
							<span>
								{workflow.labels.averageReviewWait ?? 'Average wait'}{' '}
								<b>{formatMinutes(reviewBottlenecks?.average_pending_review_minutes ?? 0)}</b>
							</span>
						</div>
					</article>

					<article className="workflow-analytics-panel">
						<div className="workflow-analytics-panel-head">
							<p>{workflow.labels.estimateVsActual ?? 'Estimate vs actual'}</p>
							<h2>{formatMinutes(Math.abs(estimateVsActual?.variance_minutes ?? 0))}</h2>
						</div>
						<div className="workflow-analytics-stack">
							<span>
								{workflow.labels.estimatedLoad ?? 'Estimated'}{' '}
								<b>{formatMinutes(estimateVsActual?.estimated_minutes ?? 0)}</b>
							</span>
							<span>
								{workflow.labels.trackedTime ?? 'Actual'} <b>{formatMinutes(estimateVsActual?.actual_minutes ?? 0)}</b>
							</span>
							<span>
								{workflow.labels.variance ?? 'Variance'} <b>{formatMinutes(estimateVsActual?.variance_minutes ?? 0)}</b>
							</span>
							<span>
								{workflow.labels.actualRatio ?? 'Actual ratio'}{' '}
								<b>{Math.round((estimateVsActual?.actual_to_estimate_ratio ?? 0) * 100)}%</b>
							</span>
						</div>
					</article>
				</section>
			) : null}

			{workflowReport ? (
				<section className="workflow-forecast-board">
					<div className="workflow-report-board-head">
						<div>
							<p>{workflow.labels.designerForecast ?? 'Designer forecast'}</p>
							<h2>{workflow.labels.capacityForecast ?? 'Capacity forecast'}</h2>
						</div>
						<span>
							{workflowReport.tasks_sampled} {workflow.labels.cards}
						</span>
					</div>
					<div className="workflow-forecast-layout">
						<div className="workflow-forecast-list">
							{forecastRows.map((row) => (
								<article key={row.user.id} className="workflow-forecast-card" data-risk={row.risk}>
									<div className="workflow-forecast-card-head">
										<AvatarBadge user={row.user} size={34} />
										<div className="min-w-0">
											<h3>
												{row.user.first_name} {row.user.last_name}
											</h3>
											<p>
												{row.open_tasks} {workflow.labels.openLower} - {row.overdue_tasks}{' '}
												{workflow.labels.overdueLower}
											</p>
										</div>
										<strong>{row.load_percent}%</strong>
									</div>
									<div className="workflow-forecast-track" aria-hidden="true">
										<span style={{ width: `${Math.min(row.load_percent, 100)}%` }} />
									</div>
									<div className="workflow-forecast-card-foot">
										<span>{formatMinutes(row.remaining_minutes)}</span>
										<span>
											{row.forecast_days} {workflow.labels.daysUnit.toLowerCase()}
										</span>
										<span>{riskLabelFor(row.risk)}</span>
									</div>
								</article>
							))}
							{forecastRows.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkloadData} /> : null}
						</div>
						<div className="workflow-status-distribution">
							{statusRows.map((row) => (
								<div key={row.status}>
									<span>{labelFor(row.status)}</span>
									<strong>{row.count}</strong>
								</div>
							))}
						</div>
					</div>
				</section>
			) : null}

			{timeReport.length ? (
				<section className="workflow-report-analytics">
					<article className="workflow-report-chart-card workflow-report-chart-card-wide">
						<div className="workflow-report-chart-head">
							<div>
								<p>{workflow.labels.analyticsStudio}</p>
								<h2>{workflow.labels.timeByProject}</h2>
							</div>
							<span>{workflow.labels.topFiveProjects}</span>
						</div>
						<div
							className="workflow-report-chart-body workflow-report-chart-body-bar"
							style={{ height: reportBarHeight }}
						>
							{reportChartsMounted ? <Bar data={reportBarData} options={reportBarOptions} /> : renderChartPlaceholder()}
						</div>
						<div className="workflow-report-chart-keys">
							{chartRows.map((row, index) => (
								<span key={row.project.id}>
									<b>#{index + 1}</b>
									{row.project.name}
								</span>
							))}
						</div>
					</article>

					<article className="workflow-report-chart-card workflow-report-doughnut-card">
						<div className="workflow-report-chart-head">
							<div>
								<p>{workflow.labels.reportCharts}</p>
								<h2>{workflow.labels.effortDistribution}</h2>
							</div>
						</div>
						<div className="workflow-report-chart-body workflow-report-chart-body-doughnut">
							{reportChartsMounted ? (
								<Doughnut data={reportDoughnutData} options={reportDoughnutOptions} />
							) : (
								renderChartPlaceholder()
							)}
							<div className="workflow-report-doughnut-center" aria-hidden="true">
								<span>{workflow.labels.chartTotal}</span>
								<strong>{formatMinutes(totalMinutes)}</strong>
							</div>
						</div>
					</article>

					<article className="workflow-report-chart-card workflow-report-line-card">
						<div className="workflow-report-chart-head">
							<div>
								<p>{workflow.labels.reportChartsHint}</p>
								<h2>{workflow.labels.effortCurve}</h2>
							</div>
						</div>
						<div className="workflow-report-chart-body workflow-report-chart-body-line">
							{reportChartsMounted ? (
								<Line data={reportCurveData} options={reportCurveOptions} />
							) : (
								renderChartPlaceholder()
							)}
						</div>
					</article>

					<div className="workflow-report-insights">
						<div className="workflow-report-insight">
							<span>{workflow.labels.topShare}</span>
							<strong>{topSharePercent}%</strong>
						</div>
						<div className="workflow-report-insight">
							<span>{workflow.labels.remainingProjects}</span>
							<strong>{remainingProjectCount}</strong>
						</div>
						<div className="workflow-report-insight">
							<span>{workflow.labels.chartTotal}</span>
							<strong>{formatMinutes(totalMinutes)}</strong>
						</div>
					</div>
				</section>
			) : null}

			<section className="workflow-report-board">
				<div className="workflow-report-board-head">
					<div>
						<p>{workflow.labels.timeLedger}</p>
						<h2>{workflow.sections.projectTotals.title}</h2>
					</div>
					<span>
						{timeReport.length} {workflow.labels.projects}
					</span>
				</div>
				<div className="workflow-report-grid">
					{sortedReport.map((row: TimeReportRow, index) => {
						const percent = Math.max(8, Math.round((row.minutes / maxMinutes) * 100));
						return (
							<article key={row.project.id} className="workflow-report-card">
								<div className="workflow-report-card-top">
									<div className="workflow-report-rank">{String(index + 1).padStart(2, '0')}</div>
									<div className="min-w-0">
										<h3>{row.project.name}</h3>
										<p>
											{row.project.manager.first_name} {row.project.manager.last_name}
										</p>
									</div>
									<Chip>{formatMinutes(row.minutes)}</Chip>
								</div>
								<div className="workflow-report-bar" aria-hidden="true">
									<span style={{ width: `${percent}%` }} />
								</div>
								<div className="workflow-report-card-foot">
									<span>{workflow.labels.manager}</span>
									<strong>{workflow.labels.loggedSuffix}</strong>
								</div>
							</article>
						);
					})}
					{timeReport.length === 0 ? <EmptyState {...workflow.emptyStates.noReportData} /> : null}
				</div>
			</section>
		</div>
	);
};
