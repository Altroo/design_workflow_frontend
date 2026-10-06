import {
	formatReportElapsedDuration,
	formatReportHours,
	formatReportWorkDuration,
} from '@/utils/workflow/workflowReportFormatting';
import { STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import type { TimeReportRow, WorkflowAnalyticsReport } from '@/types/designWorkflowTypes';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';
import { WORK_DAY_MINUTES } from '@/utils/rawData';

export const escapeHtml = (value: string | number | null | undefined) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

export const formatExportDateTime = (value: string, locale: string) => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

export const buildPrintableReport = ({
	dateWindow,
	scopeLabel,
	generatedAt,
	locale,
	totalMinutes,
	timeReport,
	workflowReport,
	copy,
	labelFor,
	riskLabelFor,
}: {
	dateWindow: string;
	scopeLabel: string;
	generatedAt: string;
	locale: string;
	totalMinutes: number;
	timeReport: TimeReportRow[];
	workflowReport?: WorkflowAnalyticsReport;
	copy: PrintableReportCopy;
	labelFor: (value: string) => string;
	riskLabelFor: (risk: string) => string;
}) => {
	const generatedLabel = formatExportDateTime(generatedAt, locale);
	const forecastRows = workflowReport?.capacity ?? [];
	const workDuration = (minutes: number) =>
		Math.abs(minutes) < WORK_DAY_MINUTES
			? formatReportHours(minutes)
			: `${formatReportWorkDuration(minutes, locale)} (${formatReportHours(minutes)})`;
	const projectRows = timeReport
		.map(
			(row) => `
			<tr>
				<td>${escapeHtml(row.project.name)}</td>
				<td>${escapeHtml(`${row.project.manager.first_name} ${row.project.manager.last_name}`.trim() || row.project.manager.email)}</td>
				<td><span class="status-chip">${escapeHtml(labelFor(row.project.status))}</span></td>
				<td>${escapeHtml(labelFor(row.project.priority))}</td>
				<td>${escapeHtml(formatReportWorkDuration(row.minutes, locale))}</td>
				<td>${escapeHtml(formatReportHours(row.minutes))}</td>
				<td>${escapeHtml(totalMinutes ? `${Math.round((row.minutes / totalMinutes) * 100)}%` : '0%')}</td>
			</tr>
		`,
		)
		.join('');
	const forecastHtml = forecastRows
		.map(
			(row) => `
			<tr>
				<td>${escapeHtml(`${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email)}</td>
				<td>${escapeHtml(row.open_tasks)}</td>
				<td>${escapeHtml(row.overdue_tasks)}</td>
				<td>${escapeHtml(formatReportHours(row.remaining_minutes))}</td>
				<td>${escapeHtml(`${row.load_percent}%`)}</td>
				<td>${escapeHtml(formatReportWorkDuration(row.remaining_minutes, locale))}</td>
				<td>${escapeHtml(riskLabelFor(row.risk))}</td>
			</tr>
		`,
		)
		.join('');
	const statusHtml = STATUS_COLUMNS.map(
		(status) => `
			<div class="status-item">
				<span><i class="status-dot status-${escapeHtml(status)}"></i>${escapeHtml(labelFor(status))}</span>
				<strong>${escapeHtml(workflowReport?.status_counts[status] ?? 0)}</strong>
			</div>
		`,
	).join('');
	const review = workflowReport?.review_bottlenecks;
	const estimate = workflowReport?.estimate_vs_actual;
	return `<!doctype html>
		<html lang="${locale.startsWith('fr') ? 'fr' : 'en'}">
			<head>
				<meta charset="utf-8" />
				<title>${escapeHtml(copy.title)}</title>
				<link rel="stylesheet" href="/assets/styles/workflow-report.css" />
			</head>
			<body>
				<main class="report">
					<header class="report-header">
						<div class="brand-card"><div class="brand-rail"></div><div class="brand-copy"><p class="eyebrow">${escapeHtml(copy.issuedBy)}</p><strong>${escapeHtml(copy.brand)}</strong><span>${escapeHtml(copy.reportStudio)}</span></div></div>
						<div class="report-title"><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.generatedOn)} ${escapeHtml(generatedLabel)}</p></div>
					</header>
					<section class="meta-strip">
						<div class="meta"><span>${escapeHtml(copy.scope)}</span><strong>${escapeHtml(scopeLabel)}</strong></div>
						<div class="meta"><span>${escapeHtml(copy.period)}</span><strong>${escapeHtml(dateWindow)}</strong></div>
						<div class="meta"><span>${escapeHtml(copy.tasksSampled)}</span><strong>${escapeHtml(workflowReport?.tasks_sampled ?? 0)}</strong></div>
					</section>
					<section class="kpis">
						<div class="kpi" style="--accent:#4f46e5"><span>${escapeHtml(copy.trackedTime)}</span><strong>${escapeHtml(workDuration(totalMinutes))}</strong><small>${escapeHtml(timeReport.length)} ${escapeHtml(copy.projectsIncluded)}</small></div>
						<div class="kpi" style="--accent:#0891b2"><span>${escapeHtml(copy.leadTime)}</span><strong>${escapeHtml(workflowReport?.status_counts.done ? formatReportElapsedDuration(workflowReport.lead_time_days * 1440, locale) : '-')}</strong><small>${escapeHtml(copy.calendarHint)}</small></div>
						<div class="kpi" style="--accent:#15803d"><span>${escapeHtml(copy.cycleTime)}</span><strong>${escapeHtml(workflowReport?.status_counts.done ? formatReportElapsedDuration(workflowReport.cycle_time_days * 1440, locale) : '-')}</strong><small>${escapeHtml(copy.calendarHint)}</small></div>
						<div class="kpi" style="--accent:#be123c"><span>${escapeHtml(copy.blockedTime)}</span><strong>${escapeHtml(formatReportElapsedDuration(workflowReport?.blocked_time_minutes ?? 0, locale))}</strong><small>${escapeHtml(workflowReport?.blocked_tasks ?? 0)} ${escapeHtml(copy.blockedTasks)}</small></div>
					</section>
					<aside class="report-guidance"><p><strong>${escapeHtml(copy.workdayBasis)}</strong></p><p>${escapeHtml(copy.schedule)}</p><p>${escapeHtml(copy.trackingHint)}</p><p>${escapeHtml(copy.collaborationHint)}</p><p>${escapeHtml(copy.periodHint)}</p></aside>
					<section class="section">
						<div class="section-head"><h2>${escapeHtml(copy.projectTime)}</h2><span>${escapeHtml(timeReport.length)} ${escapeHtml(copy.projectsIncluded)}</span></div>
						<table>
							<thead><tr><th>${escapeHtml(copy.project)}</th><th>${escapeHtml(copy.manager)}</th><th>${escapeHtml(copy.status)}</th><th>${escapeHtml(copy.priority)}</th><th>${escapeHtml(copy.workDuration)}</th><th>${escapeHtml(copy.hours)}</th><th>${escapeHtml(copy.share)}</th></tr></thead>
							<tbody>${projectRows || `<tr><td class="empty" colspan="7">${escapeHtml(copy.noProjectTimeWindow)}</td></tr>`}</tbody>
						</table>
					</section>
					<section class="section report-grid">
						<article class="mini-card" style="--accent:#b45309"><h3>${escapeHtml(copy.reviewBottlenecks)}</h3><div class="mini-metrics"><div><span>${escapeHtml(copy.needsReview)}</span><strong>${escapeHtml(review?.needs_review ?? 0)}</strong></div><div><span>${escapeHtml(copy.changesRequested)}</span><strong>${escapeHtml(review?.changes_requested ?? 0)}</strong></div><div><span>${escapeHtml(copy.approved)}</span><strong>${escapeHtml(review?.approved ?? 0)}</strong></div><div><span>${escapeHtml(copy.pendingReviewMinutes)}</span><strong>${escapeHtml(formatReportElapsedDuration(review?.pending_review_minutes ?? 0, locale))}</strong></div></div></article>
						<article class="mini-card" style="--accent:#0891b2"><h3>${escapeHtml(copy.estimateVsActual)}</h3><div class="mini-metrics"><div><span>${escapeHtml(copy.estimatedMinutes)}</span><strong>${escapeHtml(workDuration(estimate?.estimated_minutes ?? 0))}</strong></div><div><span>${escapeHtml(copy.actualMinutes)}</span><strong>${escapeHtml(workDuration(estimate?.actual_minutes ?? 0))}</strong></div><div><span>${escapeHtml(copy.varianceMinutes)}</span><strong>${escapeHtml(workDuration(estimate?.variance_minutes ?? 0))}</strong></div><div><span>${escapeHtml(copy.tasksSampled)}</span><strong>${escapeHtml(workflowReport?.tasks_sampled ?? 0)}</strong></div></div></article>
					</section>
					<section class="section">
						<div class="section-head"><h2>${escapeHtml(copy.statusDistribution)}</h2><span>${escapeHtml(workflowReport?.tasks_sampled ?? 0)} ${escapeHtml(copy.tasksSampled.toLowerCase())}</span></div>
						<div class="status-grid">${statusHtml}</div>
					</section>
					<section class="section">
						<div class="section-head"><h2>${escapeHtml(copy.designerForecast)}</h2><span>${escapeHtml(forecastRows.length)} ${escapeHtml(copy.designersIncluded)}</span></div>
						<p class="report-guidance">${escapeHtml(copy.capacityHint)}</p>
						<table>
							<thead><tr><th>${escapeHtml(copy.designer)}</th><th>${escapeHtml(copy.openTasks)}</th><th>${escapeHtml(copy.overdueTasks)}</th><th>${escapeHtml(copy.remainingMinutes)}</th><th>${escapeHtml(copy.loadPercent)}</th><th>${escapeHtml(copy.workDuration)}</th><th>${escapeHtml(copy.risk)}</th></tr></thead>
							<tbody>${forecastHtml || `<tr><td class="empty" colspan="7">${escapeHtml(copy.noForecastRows)}</td></tr>`}</tbody>
						</table>
					</section>
				</main>
				<footer class="report-footer"><span>${escapeHtml(copy.brand)} - ${escapeHtml(copy.generatedOn)} ${escapeHtml(generatedLabel)}</span><span>${escapeHtml(copy.page)}</span></footer>
			</body>
		</html>`;
};
