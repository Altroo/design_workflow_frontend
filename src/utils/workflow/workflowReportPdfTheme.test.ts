import { REPORT_PDF_COLORS, REPORT_PDF_STYLES, REPORT_PDF_TABLE_LAYOUT } from './workflowReportPdfTheme';

it('uses readable app colors and bounded table spacing', () => {
	expect(REPORT_PDF_STYLES.title.color).toBe(REPORT_PDF_COLORS.navy);
	expect(REPORT_PDF_STYLES.note.fontSize).toBeGreaterThanOrEqual(8);
	expect(REPORT_PDF_TABLE_LAYOUT).toMatchObject({
		paddingLeft: expect.any(Function),
		paddingRight: expect.any(Function),
		hLineColor: expect.any(Function),
	});
});
