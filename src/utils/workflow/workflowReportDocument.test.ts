import { workflowReport, reportRows } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { buildPrintableReport } from './workflowReportDocument';
import { csvCell, ensureFileExtension } from './workflowReportExport';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';

it('builds an escaped localized report with its external stylesheet', () => {
	const copy = new Proxy(
		{},
		{ get: (_target, key) => (key === 'title' ? '<script>unsafe</script>' : String(key)) },
	) as PrintableReportCopy;
	const scopeMarkup = '<span title="Scope & details">Project</span>';
	const html = buildPrintableReport({
		dateWindow: 'October',
		scopeLabel: scopeMarkup,
		generatedAt: '2026-10-05T09:00:00Z',
		locale: 'fr-FR',
		totalMinutes: 0,
		timeReport: [],
		copy,
		labelFor: String,
		riskLabelFor: String,
	});
	expect(html).toContain('lang="fr"');
	expect(html).toContain('/assets/styles/workflow-report.css');
	expect(html).not.toContain('<style>');
	expect(html).not.toContain('<script>');
	expect(html).not.toContain(scopeMarkup);
	expect(html).toContain('&lt;span title=&quot;Scope &amp; details&quot;&gt;');
	expect(html).toContain('&lt;script&gt;');
});

it('uses eight-hour effort days, 24-hour elapsed days and signed variances in exports', () => {
	const copy = new Proxy({}, { get: (_target, key) => String(key) }) as PrintableReportCopy;
	const html = buildPrintableReport({
		dateWindow: 'October',
		scopeLabel: 'Team',
		generatedAt: workflowReport.generated_at,
		locale: 'fr-FR',
		totalMinutes: 2220,
		timeReport: [{ ...reportRows[0], minutes: 2220 }],
		workflowReport: {
			...workflowReport,
			status_counts: { ...workflowReport.status_counts, done: 1 },
			lead_time_days: 1,
			designer_forecast: [],
		},
		copy,
		labelFor: String,
		riskLabelFor: String,
	});
	expect(html).toContain('4 j 5 h (37 h)');
	expect(html).toContain('<strong>1 j</strong>');
	expect(html).toContain('−4 h');
	expect(html).toContain('Dina Designer');
	expect(html).toContain('schedule');
	expect(html).not.toContain('0d');
});

it('escapes CSV quotes and does not duplicate extensions', () => {
	expect(csvCell('a,"b"')).toBe('"a,""b"""');
	expect(ensureFileExtension('report.CSV', '.csv')).toBe('report.CSV');
	expect(ensureFileExtension('report', 'csv')).toBe('report.csv');
});
