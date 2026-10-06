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
	const report = { ...workflowReport, status_counts: { ...workflowReport.status_counts, done: 1 }, lead_time_days: 1 };
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
