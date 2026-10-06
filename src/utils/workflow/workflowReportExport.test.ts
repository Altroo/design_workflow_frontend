import { csvCell, downloadCsv, ensureFileExtension, openPrintableReport } from './workflowReportExport';
import { printDocument } from '@/utils/printDocument';
import { buildPrintableReport } from './workflowReportDocument';

jest.mock('@/utils/printDocument', () => ({ printDocument: jest.fn() }));
jest.mock('./workflowReportDocument', () => ({
	buildPrintableReport: jest.fn(() => '<html lang="en"><head><title>Report</title></head><body>Report</body></html>'),
	formatExportDateTime: jest.fn(),
}));

it('quotes CSV values, preserves accents and normalizes extensions', () => {
	expect(csvCell('Plan, "Étage"')).toBe('"Plan, ""Étage"""');
	expect(csvCell(null)).toBe('""');
	expect(ensureFileExtension(' report.CSV... ', '.csv')).toBe('report.CSV');
});

it('downloads one UTF-8 CSV and releases its object URL', async () => {
	jest.useFakeTimers();
	const previousCreate = URL.createObjectURL,
		previousRevoke = URL.revokeObjectURL;
	const create = jest.fn<string, [Blob]>(() => 'blob:report');
	URL.createObjectURL = create;
	URL.revokeObjectURL = jest.fn();
	const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
		expect(this.download).toBe('rapport.csv');
		expect(this.isConnected).toBe(true);
	});
	try {
		downloadCsv('rapport', [
			['Titre', 'Minutes'],
			['Étage, A', 60],
		]);
		expect(click).toHaveBeenCalledTimes(1);
		expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
		expect(document.querySelector('a[download]')).toBeNull();
		jest.runOnlyPendingTimers();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
	} finally {
		click.mockRestore();
		URL.createObjectURL = previousCreate;
		URL.revokeObjectURL = previousRevoke;
		jest.useRealTimers();
	}
});

it('passes the generated report to the dedicated print helper', () => {
	const options = {} as Parameters<typeof openPrintableReport>[0];
	openPrintableReport(options);
	expect(buildPrintableReport).toHaveBeenCalledWith(options);
	expect(printDocument).toHaveBeenCalledWith(
		'<html lang="en"><head><title>Report</title></head><body>Report</body></html>',
	);
});
