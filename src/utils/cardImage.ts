export const CARD_IMAGE_CONVERSION_THRESHOLD = 8 * 1024 * 1024;

const CARD_IMAGE_MAX_EDGE = 2560;
const CARD_IMAGE_JPEG_QUALITIES = [0.84, 0.72, 0.6] as const;

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number) =>
	new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
					return;
				}
				reject(new Error('Card image conversion failed.'));
			},
			'image/jpeg',
			quality,
		);
	});

const convertedFileName = (name: string) => {
	const baseName = name.replace(/\.[^.]+$/, '').trim() || 'card-image';
	return `${baseName}-card.jpg`;
};

export const prepareCardCoverImage = async (file: File): Promise<File> => {
	if (!file.type.startsWith('image/')) {
		throw new Error('The selected file is not an image.');
	}
	if (file.size <= CARD_IMAGE_CONVERSION_THRESHOLD) return file;
	if (typeof createImageBitmap !== 'function') {
		throw new Error('This browser cannot reduce the selected image.');
	}

	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(1, CARD_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Card image conversion failed.');

		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, width, height);
		context.drawImage(bitmap, 0, 0, width, height);

		let converted: Blob | null = null;
		for (const quality of CARD_IMAGE_JPEG_QUALITIES) {
			converted = await canvasToJpeg(canvas, quality);
			if (converted.size <= CARD_IMAGE_CONVERSION_THRESHOLD) break;
		}
		if (!converted || converted.size > CARD_IMAGE_CONVERSION_THRESHOLD) {
			throw new Error('The image is still too large after conversion.');
		}

		return new File([converted], convertedFileName(file.name), {
			type: 'image/jpeg',
			lastModified: file.lastModified,
		});
	} finally {
		bitmap.close();
	}
};
