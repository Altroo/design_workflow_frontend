import { workflowReport } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen } from '@testing-library/react';
import { fr } from '@/translations/fr';
import { WorkflowReportSummary } from './workflowReportSummary';

it('labels unused planned time without suggesting completed tasks finished early', () => {
	render(<WorkflowReportSummary report={workflowReport} labels={fr.workflow.labels} locale="fr" />);
	expect(screen.getByText(fr.workflow.labels.reportWithinEstimate)).toBeVisible();
	expect(screen.getByText(fr.workflow.labels.reportEstimateHint)).toBeVisible();
	expect(screen.getByText(fr.workflow.labels.reportNoCompleted)).toBeVisible();
	expect(screen.queryByText('0d')).not.toBeInTheDocument();
});

it('distinguishes overruns, missing estimates and 24-hour delivery durations', () => {
	const report = {
		...workflowReport,
		status_counts: { ...workflowReport.status_counts, done: 1 },
		lead_time_days: 1,
		lead_time_sample_size: 1,
	};
	const { rerender } = render(
		<WorkflowReportSummary
			report={{ ...report, estimate_vs_actual: { ...report.estimate_vs_actual, variance_minutes: 60 } }}
			labels={fr.workflow.labels}
			locale="fr"
		/>,
	);
	expect(screen.getByText(fr.workflow.labels.reportOverEstimate)).toBeVisible();
	expect(screen.getByText('1 j')).toBeVisible();
	rerender(
		<WorkflowReportSummary
			report={{ ...report, estimate_vs_actual: { ...report.estimate_vs_actual, estimated_minutes: 0 } }}
			labels={fr.workflow.labels}
			locale="fr"
		/>,
	);
	expect(screen.getByText(fr.workflow.labels.reportNoEstimate)).toBeVisible();
	expect(screen.queryByText(fr.workflow.labels.reportWithinEstimate)).not.toBeInTheDocument();
});

it('shows missing dates and separates formal requests from cards moved into review', () => {
	render(
		<WorkflowReportSummary
			report={{
				...workflowReport,
				status_counts: { ...workflowReport.status_counts, done: 2, in_review: 3 },
				lead_time_days: null,
				cycle_time_days: null,
				review_bottlenecks: {
					...workflowReport.review_bottlenecks,
					needs_review: 0,
					in_review_without_request: 3,
					average_pending_review_minutes: null,
				},
			}}
			labels={fr.workflow.labels}
			locale="fr"
		/>,
	);
	expect(screen.getAllByText(fr.workflow.labels.reportMissingDates)).toHaveLength(2);
	expect(screen.getAllByText(`0 / 2 ${fr.workflow.labels.reportDocumentedTasks}`)).toHaveLength(2);
	expect(screen.getByText(fr.workflow.labels.reportReviewRequested).nextElementSibling).toHaveTextContent('0');
	expect(screen.getByText(fr.workflow.labels.reportReviewUnrequested).nextElementSibling).toHaveTextContent('3');
	expect(screen.getByText(fr.workflow.labels.averageReviewWait).nextElementSibling).toHaveTextContent('—');
	expect(screen.getByText(fr.workflow.labels.reportCompletionHint)).toBeVisible();
	expect(screen.getByText(fr.workflow.labels.reportReviewHint)).toBeVisible();
});
