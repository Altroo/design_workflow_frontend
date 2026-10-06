import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { buildReportPdfDocument } from './workflowReportDocument';

// Embedded fonts: the PDF never depends on CSS or external font/image requests.
pdfMake.addVirtualFileSystem(pdfFonts);

export const createReportPdf = (options: Parameters<typeof buildReportPdfDocument>[0]): Promise<Blob> =>
	pdfMake.createPdf(buildReportPdfDocument(options)).getBlob();
