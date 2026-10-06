import type { WorkflowAnalyticsReport } from '@/types/designWorkflowTypes';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import { formatReportElapsedDuration, reportVarianceLabel } from '@/utils/workflow/workflowReportFormatting';
import { WorkflowReportDuration } from './workflowReportDuration';

export const WorkflowReportSummary = ({
	report,
	labels,
	locale,
}: {
	report: WorkflowAnalyticsReport;
	labels: WorkflowCopy['labels'];
	locale: string;
}) => {
	const { review_bottlenecks: review, estimate_vs_actual: estimate } = report;
	const varianceLabel = reportVarianceLabel(estimate, labels);

	return (
		<section className="workflow-analytics-grid">
			<article className="workflow-analytics-panel">
				<div className="workflow-analytics-panel-head">
					<h2>{labels.reviewBottlenecks}</h2>
				</div>
				<dl className="workflow-report-values">
					<div>
						<dt>{labels.reportReviewRequested}</dt>
						<dd>{review.needs_review}</dd>
					</div>
					<div>
						<dt>{labels.reportReviewUnrequested}</dt>
						<dd>{review.in_review_without_request ?? 0}</dd>
					</div>
					<div>
						<dt>{labels.changesRequested}</dt>
						<dd>{review.changes_requested}</dd>
					</div>
					<div>
						<dt>{labels.reportReviewApproved}</dt>
						<dd>{review.approved}</dd>
					</div>
					<div>
						<dt>{labels.averageReviewWait}</dt>
						<dd>
							{review.average_pending_review_minutes == null
								? '—'
								: formatReportElapsedDuration(review.average_pending_review_minutes, locale)}
						</dd>
					</div>
				</dl>
				<p className="workflow-report-note">{labels.reportCalendarHint}</p>
				<p className="workflow-report-note">{labels.reportReviewHint}</p>
			</article>
			<article className="workflow-analytics-panel">
				<div className="workflow-analytics-panel-head">
					<h2>{labels.estimateVsActual}</h2>
				</div>
				<dl className="workflow-report-values">
					<div>
						<dt>{labels.estimatedLoad}</dt>
						<dd>
							<WorkflowReportDuration minutes={estimate.estimated_minutes} locale={locale} />
						</dd>
					</div>
					<div>
						<dt>{labels.trackedTime}</dt>
						<dd>
							<WorkflowReportDuration minutes={estimate.actual_minutes} locale={locale} />
						</dd>
					</div>
					<div data-tone={estimate.variance_minutes > 0 ? 'warning' : undefined}>
						<dt>{varianceLabel}</dt>
						<dd>
							{estimate.estimated_minutes ? (
								<WorkflowReportDuration minutes={Math.abs(estimate.variance_minutes)} locale={locale} />
							) : (
								'—'
							)}
						</dd>
					</div>
				</dl>
				<p className="workflow-report-note">{labels.reportEstimateHint}</p>
			</article>
			<article className="workflow-analytics-panel">
				<div className="workflow-analytics-panel-head">
					<h2>{labels.leadCycleTime}</h2>
				</div>
				{report.status_counts.done ? (
					<dl className="workflow-report-values">
						<div>
							<dt>{labels.leadTime}</dt>
							<dd>
								{report.lead_time_days == null
									? labels.reportMissingDates
									: formatReportElapsedDuration(report.lead_time_days * 1440, locale)}
								<small className="block text-xs font-normal text-(--ink-muted)">
									{report.lead_time_sample_size} / {report.status_counts.done} {labels.reportDocumentedTasks}
								</small>
							</dd>
						</div>
						<div>
							<dt>{labels.cycleTime}</dt>
							<dd>
								{report.cycle_time_days == null
									? labels.reportMissingDates
									: formatReportElapsedDuration(report.cycle_time_days * 1440, locale)}
								<small className="block text-xs font-normal text-(--ink-muted)">
									{report.cycle_time_sample_size} / {report.status_counts.done} {labels.reportDocumentedTasks}
								</small>
							</dd>
						</div>
					</dl>
				) : (
					<p className="workflow-report-note">{labels.reportNoCompleted}</p>
				)}
				<p className="workflow-report-note">{labels.reportCalendarHint}</p>
				<p className="workflow-report-note">{labels.reportCompletionHint}</p>
			</article>
		</section>
	);
};
