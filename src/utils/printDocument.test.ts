import { printDocument } from './printDocument';

afterEach(() => jest.restoreAllMocks());

it('prints a document without a stylesheet and does not print a window the user already closed', async () => {
	for (const closed of [false, true]) {
		const document = window.document.implementation.createHTMLDocument();
		const focus = jest.fn(),
			print = jest.fn();
		jest.spyOn(window, 'open').mockReturnValue({ document, focus, print, closed } as unknown as Window);
		await printDocument('<html lang="en"><head><title>Report</title></head><body>Ready</body></html>');
		expect(focus).toHaveBeenCalledTimes(closed ? 0 : 1);
		expect(print).toHaveBeenCalledTimes(closed ? 0 : 1);
	}
});

it('closes the popup if the print stylesheet never finishes loading', async () => {
	jest.useFakeTimers();
	try {
		const document = window.document.implementation.createHTMLDocument();
		const close = jest.fn(),
			print = jest.fn();
		jest.spyOn(window, 'open').mockReturnValue({ document, print, close } as unknown as Window);
		const pending = printDocument('<html lang="en"><head><link rel="stylesheet" href="/slow.css"></head></html>');
		const rejected = expect(pending).rejects.toThrow('Print stylesheet timed out');
		await jest.advanceTimersByTimeAsync(15000);
		await rejected;
		expect(close).toHaveBeenCalledTimes(1);
		expect(print).not.toHaveBeenCalled();
	} finally {
		jest.useRealTimers();
	}
});

it('loads the stylesheet before printing and never uses document.write', async () => {
	const document = window.document.implementation.createHTMLDocument();
	const print = jest.fn();
	const write = jest.spyOn(document, 'write');
	jest
		.spyOn(window, 'open')
		.mockReturnValue({ document, print, focus: jest.fn(), close: jest.fn() } as unknown as Window);
	const result = printDocument(
		'<html lang="fr"><head><link rel="stylesheet" href="/assets/styles/workflow-report.css"></head><body><h1>Rapport</h1></body></html>',
	);
	expect(document.querySelector('h1')?.textContent).toBe('Rapport');
	expect(document.documentElement.lang).toBe('fr');
	expect(print).not.toHaveBeenCalled();
	document.querySelector('link')!.dispatchEvent(new Event('load'));
	await result;
	expect(print).toHaveBeenCalledTimes(1);
	expect(write).not.toHaveBeenCalled();
});

it('reports a blocked popup instead of printing the application page', async () => {
	jest.spyOn(window, 'open').mockReturnValue(null);
	await expect(printDocument('<html lang="en"></html>')).rejects.toThrow('Print window blocked');
});

it('closes a failed print document without printing unstyled content', async () => {
	const document = window.document.implementation.createHTMLDocument();
	const close = jest.fn(),
		print = jest.fn();
	jest.spyOn(window, 'open').mockReturnValue({ document, print, close } as unknown as Window);
	const result = printDocument('<html lang="en"><head><link rel="stylesheet" href="/missing.css"></head></html>');
	document.querySelector('link')!.dispatchEvent(new Event('error'));
	await expect(result).rejects.toThrow('Print stylesheet failed');
	expect(close).toHaveBeenCalled();
	expect(print).not.toHaveBeenCalled();
});
