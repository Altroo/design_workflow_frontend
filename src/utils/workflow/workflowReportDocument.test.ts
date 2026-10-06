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

it('escapes CSV quotes and does not duplicate extensions', () => {
	expect(csvCell('a,"b"')).toBe('"a,""b"""');
	expect(ensureFileExtension('report.CSV', '.csv')).toBe('report.CSV');
	expect(ensureFileExtension('report', 'csv')).toBe('report.csv');
});
