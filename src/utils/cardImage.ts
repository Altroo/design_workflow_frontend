export const CARD_IMAGE_CONVERSION_THRESHOLD = 8 * 1024 * 1024;

const CARD_IMAGE_MAX_EDGE = 960;
const CARD_IMAGE_TARGET_BYTES = 160 * 1024;
const CARD_IMAGE_QUALITIES = [0.8, 0.68, 0.56] as const;

const canvasToThumbnail = (canvas: HTMLCanvasElement, quality: number) =>
	new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
					return;
				}
				reject(new Error('Card image conversion failed.'));
			},
			'image/webp',
			quality,
		);
	});

const convertedFileName = (name: string, type: string) => {
	const baseName = name.replace(/\.[^.]+$/, '').trim() || 'card-image';
	return `${baseName}-card.${type === 'image/webp' ? 'webp' : 'png'}`;
};

export const prepareCardCoverImage = async (file: File): Promise<File> => {
	if (!file.type.startsWith('image/')) {
		throw new Error('The selected file is not an image.');
	}
	if (typeof createImageBitmap !== 'function') {
		// The server remains authoritative, even for browsers without a decoder.
		if (file.size <= CARD_IMAGE_CONVERSION_THRESHOLD) return file;
		throw new Error('This browser cannot reduce the selected image.');
	}

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		if (file.size <= CARD_IMAGE_CONVERSION_THRESHOLD) return file;
		throw new Error('This browser cannot reduce the selected image.');
	}
	try {
		const scale = Math.min(1, CARD_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Card image conversion failed.');

		context.drawImage(bitmap, 0, 0, width, height);

		let converted: Blob | null = null;
		for (const quality of CARD_IMAGE_QUALITIES) {
			converted = await canvasToThumbnail(canvas, quality);
			if (converted.size <= CARD_IMAGE_TARGET_BYTES) break;
		}
		if (!converted || converted.size > CARD_IMAGE_CONVERSION_THRESHOLD) {
			throw new Error('The image is still too large after conversion.');
		}

		return new File([converted], convertedFileName(file.name, converted.type), {
			type: converted.type,
			lastModified: file.lastModified,
		});
	} finally {
		bitmap.close();
	}
};
