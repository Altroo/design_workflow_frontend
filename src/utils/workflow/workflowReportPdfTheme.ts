import type { CustomTableLayout, StyleDictionary } from 'pdfmake/interfaces';

export const REPORT_PDF_COLORS = {
	ink: '#334155',
	muted: '#64748b',
	navy: '#1e2a52',
	brand: '#4f46e5',
	cyan: '#0891b2',
	green: '#15803d',
	rose: '#be123c',
	amber: '#b45309',
	line: '#dbe2ee',
	soft: '#f7f8fc',
};
export const REPORT_PDF_STYLES: StyleDictionary = {
	title: { fontSize: 19, bold: true, color: REPORT_PDF_COLORS.navy, margin: [0, 2, 0, 6] },
	brand: { fontSize: 10, bold: true, color: REPORT_PDF_COLORS.brand, margin: [0, 0, 0, 4] },
	section: { fontSize: 11, bold: true, color: REPORT_PDF_COLORS.navy, margin: [0, 13, 0, 6] },
	label: { fontSize: 7.5, color: REPORT_PDF_COLORS.muted, margin: [0, 0, 0, 4] },
	metric: { fontSize: 12, bold: true, color: REPORT_PDF_COLORS.brand, margin: [0, 0, 0, 3] },
	note: { fontSize: 8, color: REPORT_PDF_COLORS.muted, lineHeight: 1.2, margin: [0, 4, 0, 3] },
	tableHeader: { fontSize: 7.5, bold: true, color: REPORT_PDF_COLORS.navy, fillColor: '#eef1f8' },
};
export const REPORT_PDF_TABLE_LAYOUT: CustomTableLayout = {
	hLineWidth: () => 0.5,
	vLineWidth: () => 0.5,
	hLineColor: () => REPORT_PDF_COLORS.line,
	vLineColor: () => REPORT_PDF_COLORS.line,
	paddingLeft: () => 7,
	paddingRight: () => 7,
	paddingTop: () => 7,
	paddingBottom: () => 7,
	fillColor: (row) => (row > 0 && row % 2 === 0 ? '#fafbfe' : null),
};
