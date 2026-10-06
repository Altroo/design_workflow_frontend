import type { WorkflowAnalyticsReport } from '@/types/designWorkflowTypes';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import { formatReportElapsedDuration } from '@/utils/workflow/workflowReportFormatting';
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
	const varianceLabel = !estimate.estimated_minutes
		? labels.reportNoEstimate
		: estimate.variance_minutes > 0
			? labels.reportOverEstimate
			: estimate.variance_minutes < 0
				? labels.reportWithinEstimate
				: labels.reportOnEstimate;

	return (
		<section className="workflow-analytics-grid">
			<article className="workflow-analytics-panel">
				<div className="workflow-analytics-panel-head">
					<h2>{labels.reviewBottlenecks}</h2>
				</div>
				<dl className="workflow-report-values">
					<div>
						<dt>{labels.needsReview}</dt>
						<dd>{review.needs_review}</dd>
					</div>
					<div>
						<dt>{labels.changesRequested}</dt>
						<dd>{review.changes_requested}</dd>
					</div>
					<div>
						<dt>{labels.approved}</dt>
						<dd>{review.approved}</dd>
					</div>
					<div>
						<dt>{labels.averageReviewWait}</dt>
						<dd>{formatReportElapsedDuration(review.average_pending_review_minutes, locale)}</dd>
					</div>
				</dl>
				<p className="workflow-report-note">{labels.reportCalendarHint}</p>
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
							<dd>{formatReportElapsedDuration(report.lead_time_days * 1440, locale)}</dd>
						</div>
						<div>
							<dt>{labels.cycleTime}</dt>
							<dd>{formatReportElapsedDuration(report.cycle_time_days * 1440, locale)}</dd>
						</div>
					</dl>
				) : (
					<p className="workflow-report-note">{labels.reportNoCompleted}</p>
				)}
				<p className="workflow-report-note">{labels.reportCalendarHint}</p>
			</article>
		</section>
	);
};
