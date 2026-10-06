'use client';
import { AvatarBadge, Chip, EmptyState, FieldLabel } from '@/components/shared/workflow/workflowFields';
import { formatReportDate, formatReportHours, reportRemainingLabel } from '@/utils/workflow/workflowReportFormatting';
import { WorkflowReportDuration } from './workflowReportDuration';
import { WorkflowReportSummary } from './workflowReportSummary';
import { openReportPdf } from '@/utils/workflow/workflowReportExport';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import {
	WorkflowDateField as DateField,
	WorkflowSelectField as SelectField,
} from '@/components/shared/workflow/workflowFormControls';
import { WorkflowPageHero, WorkflowSimpleMetric } from '@/components/shared/workflow/workflowPrimitives';
import type { TimeReportRow } from '@/types/designWorkflowTypes';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';
import { useIsClient, useToast } from '@/utils/hooks';
import { WORKFLOW_CHART_PALETTE } from '@/utils/rawData';
import type { ChartData, ChartOptions } from 'chart.js';
import {
	CircleAlert,
	CircleCheck,
	CalendarDays,
	Clock3,
	FileText,
	FolderKanban,
	RefreshCcw,
	ClipboardCheck,
	Users,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { useState } from 'react';
import type { WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
export const WorkflowReport = ({
	model,
}: {
	model: Pick<
		WorkflowController,
		| 'timeReport'
		| 'workflow'
		| 'chartTextColor'
		| 'reportFilters'
		| 'projects'
		| 'assignableUsers'
		| 'userOptionLabel'
		| 'workflowReport'
		| 'reportExportReady'
		| 'locale'
		| 't'
		| 'messageFor'
		| 'labelFor'
		| 'riskLabelFor'
		| 'setReportFilters'
	>;
}) => {
	const { onError } = useToast();
	const [isOpeningPdf, setIsOpeningPdf] = useState(false);
	const reportChartsMounted = useIsClient();
	const {
		timeReport,
		workflow,
		chartTextColor,
		reportFilters,
		projects,
		assignableUsers,
		userOptionLabel,
		workflowReport,
		reportExportReady,
		locale,
		t,
		messageFor,
		labelFor,
		riskLabelFor,
		setReportFilters,
	} = model;
	const totalMinutes = timeReport.reduce((sum, row) => sum + row.minutes, 0);
	const sortedReport = [...timeReport].sort((left, right) => right.minutes - left.minutes);
	const maxMinutes = Math.max(...timeReport.map((row) => row.minutes), 1);
	const chartRows = sortedReport.slice(0, 8);
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
					label: (context) => formatReportHours(Number(context.raw) || 0),
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
					callback: (value) => formatReportHours(Number(value) || 0),
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
	const dateWindow =
		reportFilters.start_date || reportFilters.end_date
			? `${reportFilters.start_date ? formatReportDate(reportFilters.start_date, locale) : '…'} – ${reportFilters.end_date ? formatReportDate(reportFilters.end_date, locale) : '…'}`
			: workflow.labels.allTimeWindow;
	const selectedReportProject = projects.find((item) => String(item.id) === reportFilters.project);
	const selectedReportUser = assignableUsers.find((item) => String(item.id) === reportFilters.user);
	const selectedProjectName = selectedReportProject?.name ?? '';
	const selectedUserName = selectedReportUser ? userOptionLabel(selectedReportUser) : '';
	const selectedScopeLabel = [selectedProjectName, selectedUserName].filter(Boolean).join(' - ');
	const reportScopeLabel = selectedScopeLabel || workflow.labels.allProjects;
	const generatedAt = workflowReport?.generated_at ?? new Date().toISOString();
	const timeLabel = reportFilters.user ? workflow.labels.reportPersonalTime : workflow.labels.reportTeamTime;
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
		metric: workflow.labels.metric,
		value: t.common.value,
		projectsIncluded: workflow.labels.projectsIncluded,
		trackedTime: timeLabel,
		leadTime: workflow.labels.leadTime,
		cycleTime: workflow.labels.cycleTime,
		blockedTime: workflow.labels.blockedTime,
		blockedTasks: workflow.labels.blockedTasks,
		projectTime: workflow.labels.timeByProject,
		project: workflow.labels.project,
		manager: workflow.labels.reportProjectOwner,
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
		needsReview: workflow.labels.reportReviewRequested,
		changesRequested: workflow.labels.changesRequested,
		approved: workflow.labels.reportReviewApproved,
		pendingReviewMinutes: workflow.labels.reportReviewWait,
		estimatedMinutes: workflow.labels.estimatedLoad,
		actualMinutes: timeLabel,
		varianceMinutes: workflow.labels.variance,
		designerForecast: workflow.labels.designerForecast,
		designer: messageFor('Membre', 'Member'),
		openTasks: workflow.labels.openTasksLabel,
		overdueTasks: workflow.labels.overdueTasksLabel,
		remainingMinutes: workflow.labels.reportRemaining,
		loadPercent: workflow.labels.loadPercent,
		forecastDays: workflow.labels.forecastDays,
		risk: workflow.labels.risk,
		designersIncluded: workflow.labels.designersIncluded,
		page: workflow.labels.reportPage,
		noProjectTimeWindow: workflow.labels.noProjectTimeWindow,
		noForecastRows: workflow.labels.noForecastRows,
		workdayBasis: workflow.labels.reportWorkdayBasis,
		schedule: workflow.labels.reportSchedule,
		trackingHint: workflow.labels.reportTrackingHint,
		collaborationHint: workflow.labels.reportCollaborationHint,
		periodHint: workflow.labels.reportPeriodHint,
		calendarHint: workflow.labels.reportCalendarHint,
		capacityHint: workflow.labels.reportCapacityHint,
		workDuration: workflow.labels.reportWorkDuration,
		missingDates: workflow.labels.reportMissingDates,
		documentedTasks: workflow.labels.reportDocumentedTasks,
		completionHint: workflow.labels.reportCompletionHint,
		reviewUnrequested: workflow.labels.reportReviewUnrequested,
		reviewHint: workflow.labels.reportReviewHint,
		estimateHint: workflow.labels.reportEstimateHint,
		estimateLabels: workflow.labels,
		remainingHint: workflow.labels.reportRemainingHint,
		reestimate: workflow.labels.reportReestimate,
		minimum: workflow.labels.reportMinimum,
		unestimatedTasks: workflow.labels.reportUnestimatedTasks,
		exhaustedTasks: workflow.labels.reportExhaustedTasks,
	};
	const exportPdfReport = async () => {
		setIsOpeningPdf(true);
		try {
			await openReportPdf({
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
			});
		} catch (error) {
			onError(
				error instanceof Error && error.message === 'PDF_POPUP_BLOCKED'
					? messageFor('Autorisez les fenêtres contextuelles pour ouvrir le PDF.', 'Allow pop-ups to open the PDF.')
					: messageFor(
							'Impossible de générer le PDF. Veuillez réessayer.',
							'Could not generate the PDF. Please try again.',
						),
			);
		} finally {
			setIsOpeningPdf(false);
		}
	};
	const forecastRows = [...(workflowReport?.capacity ?? [])].sort(
		(left, right) =>
			right.overdue_tasks - left.overdue_tasks ||
			right.exhausted_estimate_tasks - left.exhausted_estimate_tasks ||
			right.unestimated_tasks - left.unestimated_tasks ||
			(right.load_percent ?? 0) - (left.load_percent ?? 0),
	);
	const completedCount = workflowReport?.status_counts.done ?? 0;
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
				description={workflow.labels.reportIntro}
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
						<FieldLabel htmlFor="workflow-report-user">{workflow.labels.reportMember}</FieldLabel>
						<SelectField
							id="workflow-report-user"
							value={reportFilters.user}
							onChangeAction={(value) => setReportFilters((current) => ({ ...current, user: value }))}
							options={[
								{ value: '', label: workflow.labels.reportAllMembers },
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
						onClick={() => void exportPdfReport()}
						className="workflow-report-clear workflow-report-export"
						disabled={!reportExportReady || isOpeningPdf}
					>
						<FileText size={15} />
						<span>{isOpeningPdf ? t.common.loading : workflow.buttons.exportPdf}</span>
					</button>
				</div>
			</section>

			<aside className="workflow-report-guidance">
				<p>{workflow.labels.reportWorkdayBasis}</p>
				<details>
					<summary>{workflow.labels.reportTimeRules}</summary>
					<p>{workflow.labels.reportSchedule}</p>
					<p>{workflow.labels.reportTrackingHint}</p>
					<p>{workflow.labels.reportCollaborationHint}</p>
					<p>{workflow.labels.reportPeriodHint}</p>
				</details>
				{reportFilters.start_date || reportFilters.end_date ? <p>{workflow.labels.reportPeriodHint}</p> : null}
			</aside>

			<section className="workflow-report-metrics">
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-dark"
					icon={<Clock3 size={18} />}
					label={timeLabel}
					value={<WorkflowReportDuration minutes={totalMinutes} locale={locale} />}
				/>
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-cyan"
					icon={<ClipboardCheck size={18} />}
					label={workflow.labels.reportInReview}
					value={workflowReport?.status_counts.in_review ?? '—'}
				/>
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-green"
					icon={<CircleCheck size={18} />}
					label={workflow.labels.reportCompleted}
					value={workflowReport ? completedCount : '—'}
				/>
				<WorkflowSimpleMetric
					className="workflow-report-metric workflow-report-metric-rose"
					icon={<CircleAlert size={18} />}
					label={workflow.labels.blockedTasks}
					value={workflowReport?.blocked_tasks ?? '—'}
				/>
			</section>

			{workflowReport ? (
				<WorkflowReportSummary report={workflowReport} labels={workflow.labels} locale={locale} />
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
												{workflow.labels.openTasksLabel} : {row.open_tasks} · {workflow.labels.overdueTasksLabel} :{' '}
												{row.overdue_tasks}
											</p>
										</div>
										<strong className="workflow-report-load">
											{row.load_percent == null
												? '—'
												: `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(row.load_percent)}%`}
											<small>{workflow.labels.reportWeekLoad}</small>
										</strong>
									</div>
									<div className="workflow-forecast-track" aria-hidden="true">
										<span style={{ width: `${Math.min(row.load_percent ?? 0, 100)}%` }} />
									</div>
									<div className="workflow-forecast-card-foot">
										<div>
											<span>{workflow.labels.reportRemaining}</span>
											{row.load_percent == null ? (
												<strong>
													{reportRemainingLabel(
														row,
														locale,
														workflow.labels.reportMinimum,
														workflow.labels.reportReestimate,
													)}
												</strong>
											) : (
												<WorkflowReportDuration minutes={row.remaining_minutes} locale={locale} />
											)}
										</div>
										<span>
											{workflow.labels.risk} : {riskLabelFor(row.risk)}
										</span>
									</div>
									{row.exhausted_estimate_tasks > 0 ? (
										<p className="workflow-report-note">
											{row.exhausted_estimate_tasks} {workflow.labels.reportExhaustedTasks}
										</p>
									) : null}
									{row.unestimated_tasks > 0 ? (
										<p className="workflow-report-note">
											{row.unestimated_tasks} {workflow.labels.reportUnestimatedTasks}
										</p>
									) : null}
								</article>
							))}
							{forecastRows.length === 0 ? <EmptyState {...workflow.emptyStates.noWorkloadData} /> : null}
						</div>
						<div className="workflow-status-distribution">
							<h3>{workflow.labels.statusDistribution}</h3>
							{statusRows.map((row) => (
								<div key={row.status}>
									<span>{labelFor(row.status)}</span>
									<strong>{row.count}</strong>
								</div>
							))}
						</div>
					</div>
					<p className="workflow-report-note">{workflow.labels.reportCapacityHint}</p>
					<p className="workflow-report-note">{workflow.labels.reportRemainingHint}</p>
				</section>
			) : null}

			{timeReport.length ? (
				<section className="workflow-report-analytics">
					<article className="workflow-report-chart-card workflow-report-chart-card-wide">
						<div className="workflow-report-chart-head">
							<div>
								<h2>{workflow.labels.timeByProject}</h2>
							</div>
							<span>{workflow.labels.topFiveProjects}</span>
						</div>
						<div
							className="workflow-report-chart-body workflow-report-chart-body-bar"
							style={{ height: reportBarHeight }}
						>
							{reportChartsMounted ? (
								<Bar
									data={reportBarData}
									options={reportBarOptions}
									role="img"
									aria-label={workflow.labels.timeByProject}
								/>
							) : (
								renderChartPlaceholder()
							)}
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
				</section>
			) : null}

			<section className="workflow-report-board">
				<div className="workflow-report-board-head">
					<div>
						<h2>{workflow.labels.reportDetails}</h2>
					</div>
					<span>
						{timeReport.length} {workflow.labels.projects}
					</span>
				</div>
				<div className="workflow-report-grid">
					{sortedReport.map((row: TimeReportRow, index) => {
						const percent = Math.round((row.minutes / maxMinutes) * 100);
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
									<Chip>
										<WorkflowReportDuration minutes={row.minutes} locale={locale} />
									</Chip>
								</div>
								<div className="workflow-report-bar" aria-hidden="true">
									<span style={{ width: `${percent}%` }} />
								</div>
								<div className="workflow-report-card-foot">
									<span>{workflow.labels.reportProjectOwner}</span>
									<strong>
										{totalMinutes ? Math.round((row.minutes / totalMinutes) * 100) : 0}%{' '}
										{workflow.labels.reportProjectShare}
									</strong>
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
