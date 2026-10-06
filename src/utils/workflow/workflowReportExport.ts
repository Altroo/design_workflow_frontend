import type { buildReportPdfDocument } from './workflowReportDocument';

export { formatExportDateTime } from './workflowReportDocument';

export const openReportPdf = async (options: Parameters<typeof buildReportPdfDocument>[0]) => {
	// Reserve a tab during the click, before loading the renderer, to retain the user gesture.
	const viewer = window.open('', '_blank');
	if (!viewer) throw new Error('PDF_POPUP_BLOCKED');
	viewer.document.title = options.copy.title;
	viewer.document.body.textContent = options.copy.title;
	let objectUrl: string | undefined;
	try {
		const { createReportPdf } = await import('./workflowReportPdf');
		const blob = await createReportPdf(options);
		if (viewer.closed) return;
		objectUrl = URL.createObjectURL(blob);
		viewer.location.replace(objectUrl);
		// Retain the PDF while the viewer is open so saving remains available.
		const releasedUrl = objectUrl;
		const cleanup = window.setInterval(() => {
			if (viewer.closed) {
				URL.revokeObjectURL(releasedUrl);
				window.clearInterval(cleanup);
			}
		}, 1000);
	} catch (error) {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		if (!viewer.closed) viewer.close();
		throw error;
	}
};
