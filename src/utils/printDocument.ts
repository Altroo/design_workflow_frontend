/** Opens the print document without document. Write and waits for its stylesheet. */
export const printDocument = async (html: string): Promise<void> => {
	const popup = window.open('', '_blank', 'width=960,height=720');
	if (!popup) throw new Error('Print window blocked');
	const document = popup.document;
	const parsed = new DOMParser().parseFromString(html, 'text/html');
	const root = document.importNode(parsed.documentElement, true);
	const stylesheet = root.querySelector<HTMLLinkElement>('link[rel="stylesheet"]');
	try {
		const loaded = stylesheet
			? new Promise<void>((resolve, reject) => {
					stylesheet.href = new URL(stylesheet.getAttribute('href')!, window.location.origin).href;
					const timeout = window.setTimeout(() => reject(new Error('Print stylesheet timed out')), 15000);
					stylesheet.onload = () => {
						window.clearTimeout(timeout);
						resolve();
					};
					stylesheet.onerror = () => {
						window.clearTimeout(timeout);
						reject(new Error('Print stylesheet failed'));
					};
				})
			: await Promise.resolve();
		document.replaceChild(root, document.documentElement);
		if (!document.doctype) document.insertBefore(document.implementation.createDocumentType('html', '', ''), root);
		await loaded;
		await document.fonts?.ready;
		if (!popup.closed) {
			popup.focus();
			popup.print();
		}
	} catch (error) {
		popup.close();
		throw error;
	}
};
