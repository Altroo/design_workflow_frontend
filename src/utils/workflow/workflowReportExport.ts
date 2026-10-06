import { printDocument } from '@/utils/printDocument';
import { buildPrintableReport } from './workflowReportDocument';

export const csvCell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const ensureFileExtension = (filename: string, extension: string) => {
	const normalizedExtension = extension.replace(/^\./, '').toLowerCase();
	const normalizedFilename = filename.trim().replace(/\.+$/, '');
	return normalizedFilename.toLowerCase().endsWith(`.${normalizedExtension}`)
		? normalizedFilename
		: `${normalizedFilename}.${normalizedExtension}`;
};

export const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
	if (typeof window === 'undefined') return;
	const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`], {
		type: 'text/csv;charset=utf-8',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = ensureFileExtension(filename, 'csv');
	link.rel = 'noopener';
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export { formatExportDateTime } from './workflowReportDocument';
export const openPrintableReport = (options: Parameters<typeof buildPrintableReport>[0]) =>
	printDocument(buildPrintableReport(options));
