import { workflowReport, reportRows } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { buildReportPdfDocument, formatExportDateTime } from './workflowReportDocument';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';
import { fr } from '@/translations/fr';

const copy = new Proxy(
	{},
	{ get: (_target, key) => (key === 'estimateLabels' ? fr.workflow.labels : String(key)) },
) as PrintableReportCopy;
const options = {
	dateWindow: 'October',
	scopeLabel: 'Team',
	generatedAt: workflowReport.generated_at,
	locale: 'fr-FR',
	totalMinutes: 2220,
	timeReport: [{ ...reportRows[0], minutes: 2220 }],
	copy,
	labelFor: String,
	riskLabelFor: String,
};

it('builds a native A4 document with literal user text, embedded-font styling and no HTML/CSS dependency', () => {
	const report = buildReportPdfDocument({ ...options, scopeLabel: '<script>user text</script>' });
	expect(report.pageSize).toBe('A4');
	expect(report.defaultStyle?.font).toBe('Roboto');
	expect(report.info?.subject).toContain('<script>user text</script>');
	expect(JSON.stringify(report)).not.toContain('.css');
	expect(report.footer).toEqual(expect.any(Function));
});
it('uses eight-hour effort days, unrounded elapsed time and explains the unused estimate', () => {
	const report = buildReportPdfDocument({
		...options,
		workflowReport: {
			...workflowReport,
			status_counts: { ...workflowReport.status_counts, done: 1 },
			lead_time_days: 57 / 1440,
			lead_time_sample_size: 1,
			designer_forecast: [],
		},
	});
	const content = JSON.stringify(report);
	expect(content).toContain('4 j 5 h (37 h)');
	expect(content).toContain('57 min');
	expect(content).toContain(fr.workflow.labels.reportWithinEstimate);
	expect(content).toContain('4 h');
	expect(content).not.toContain('−4 h');
	expect(content).toContain('Dina Designer');
	for (const note of [
		'schedule',
		'completionHint',
		'reviewUnrequested',
		'reviewHint',
		'estimateHint',
		'remainingHint',
		'periodHint',
	])
		expect(content).toContain(note);
});
it('never represents unknown completion or exhausted estimates as zero remaining work', () => {
	const content = JSON.stringify(
		buildReportPdfDocument({
			...options,
			workflowReport: {
				...workflowReport,
				status_counts: { ...workflowReport.status_counts, done: 2 },
				lead_time_days: null,
				cycle_time_days: null,
				capacity: [
					{
						...workflowReport.capacity[0],
						remaining_minutes: 0,
						load_percent: null,
						forecast_days: null,
						exhausted_estimate_tasks: 1,
						risk: 'high',
					},
				],
			},
		}),
	);
	expect(content).toContain('missingDates');
	expect(content).toContain('0 / 2 documentedTasks');
	expect(content).toContain('reestimate');
	expect(content).toContain('1 exhaustedTasks');
	expect(content).toContain('#be123c');
	expect(content).not.toContain('0%');
});
it('handles empty reports and invalid dates without inventing data', () => {
	const content = JSON.stringify(buildReportPdfDocument({ ...options, timeReport: [], totalMinutes: 0 }));
	expect(content).toContain('noProjectTimeWindow');
	expect(content).toContain('noForecastRows');
	expect(formatExportDateTime('unknown', 'fr')).toBe('unknown');
});
