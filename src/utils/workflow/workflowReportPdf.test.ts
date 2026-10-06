/** @jest-environment node */
import { createReportPdf } from './workflowReportPdf';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';
import { fr } from '@/translations/fr';

it('generates genuine PDF bytes with fonts, not an HTML document', async () => {
	const copy = new Proxy(
		{},
		{ get: (_target, key) => (key === 'estimateLabels' ? fr.workflow.labels : String(key)) },
	) as PrintableReportCopy;
	const blob = await createReportPdf({
		dateWindow: 'October',
		scopeLabel: 'Test',
		generatedAt: '2026-10-06T09:00:00Z',
		locale: 'fr',
		totalMinutes: 0,
		timeReport: [],
		copy,
		labelFor: String,
		riskLabelFor: String,
	});
	expect(blob.type).toBe('application/pdf');
	const bytes = Buffer.from(await blob.arrayBuffer());
	expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
	expect(bytes.length).toBeGreaterThan(10000);
});
