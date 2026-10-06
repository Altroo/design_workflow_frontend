import { openReportPdf } from './workflowReportExport';
import { createReportPdf } from './workflowReportPdf';
jest.mock('./workflowReportPdf', () => ({ createReportPdf: jest.fn() }));

const options = { copy: { title: 'Rapport PDF' } } as Parameters<typeof openReportPdf>[0];
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
beforeEach(() => {
	jest.useFakeTimers();
	URL.createObjectURL = jest.fn(() => 'blob:report');
	URL.revokeObjectURL = jest.fn();
	jest.mocked(createReportPdf).mockResolvedValue(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
});
afterEach(() => {
	jest.clearAllTimers();
	jest.useRealTimers();
	jest.restoreAllMocks();
	URL.createObjectURL = originalCreate;
	URL.revokeObjectURL = originalRevoke;
});
const viewer = () => ({
	document: window.document.implementation.createHTMLDocument(),
	location: { replace: jest.fn() },
	close: jest.fn(),
	closed: false,
});

it('opens a real PDF in a reserved tab, never prints or forces a download, and retains it until closed', async () => {
	const tab = viewer();
	const open = jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
	const print = jest.spyOn(window, 'print');
	const pending = openReportPdf(options);
	expect(open).toHaveBeenCalledWith('', '_blank');
	await pending;
	expect(createReportPdf).toHaveBeenCalledWith(options);
	expect(tab.location.replace).toHaveBeenCalledWith('blob:report');
	expect(print).not.toHaveBeenCalled();
	expect(document.querySelector('a[download]')).toBeNull();
	jest.advanceTimersByTime(60000);
	expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	tab.closed = true;
	jest.advanceTimersByTime(1000);
	expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
	expect(jest.getTimerCount()).toBe(0);
});
it('distinguishes an actually blocked window from a rendering error', async () => {
	jest.spyOn(window, 'open').mockReturnValue(null);
	await expect(openReportPdf(options)).rejects.toThrow('PDF_POPUP_BLOCKED');
	const tab = viewer();
	jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
	jest.mocked(createReportPdf).mockRejectedValueOnce(new Error('PDF generation failed'));
	await expect(openReportPdf(options)).rejects.toThrow('PDF generation failed');
	expect(tab.close).toHaveBeenCalled();
});
it('does not reopen a viewer the user closed while generation was in progress', async () => {
	const tab = viewer();
	jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
	const pending = openReportPdf(options);
	tab.closed = true;
	await pending;
	expect(URL.createObjectURL).not.toHaveBeenCalled();
	expect(tab.location.replace).not.toHaveBeenCalled();
});
