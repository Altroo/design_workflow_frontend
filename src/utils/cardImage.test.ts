import { CARD_IMAGE_CONVERSION_THRESHOLD, prepareCardCoverImage } from './cardImage';

describe('prepareCardCoverImage', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		Reflect.deleteProperty(globalThis, 'createImageBitmap');
	});

	it('delegates small images to the backend when browser decoding is unavailable', async () => {
		const file = new File(['small'], 'small.png', { type: 'image/png' });

		await expect(prepareCardCoverImage(file)).resolves.toBe(file);
	});

	it.each([100, CARD_IMAGE_CONVERSION_THRESHOLD + 1])(
		'converts images to thumbnails even below the old limit (%s bytes)',
		async (size) => {
			const file = new File(['large'], 'room-render.png', { type: 'image/png', lastModified: 123 });
			Object.defineProperty(file, 'size', { value: size });
			const bitmap = { width: 5000, height: 2500, close: jest.fn() } as unknown as ImageBitmap;
			Object.defineProperty(globalThis, 'createImageBitmap', {
				configurable: true,
				value: jest.fn().mockResolvedValue(bitmap),
			});
			const drawImage = jest.fn();
			const fillRect = jest.fn();
			jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
				drawImage,
				fillRect,
				fillStyle: '',
			} as unknown as CanvasRenderingContext2D);
			jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
				callback(new Blob(['compressed'], { type: 'image/webp' }));
			});

			const converted = await prepareCardCoverImage(file);

			expect(converted).not.toBe(file);
			expect(converted.name).toBe('room-render-card.webp');
			expect(converted.type).toBe('image/webp');
			expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 960, 480);
			expect(fillRect).not.toHaveBeenCalled();
			expect(bitmap.close).toHaveBeenCalled();
		},
	);

	it('falls back to server conversion if browser decoding fails, but blocks oversized originals', async () => {
		Object.defineProperty(globalThis, 'createImageBitmap', {
			configurable: true,
			value: jest.fn().mockRejectedValue(new Error('Unsupported')),
		});
		const file = new File(['original'], 'room.tif', { type: 'image/tiff' });
		await expect(prepareCardCoverImage(file)).resolves.toBe(file);
		Object.defineProperty(file, 'size', { value: CARD_IMAGE_CONVERSION_THRESHOLD + 1 });
		await expect(prepareCardCoverImage(file)).rejects.toThrow('cannot reduce');
		Reflect.deleteProperty(globalThis, 'createImageBitmap');
		await expect(prepareCardCoverImage(file)).rejects.toThrow('cannot reduce');
	});

	it('does not upscale, retries quality, and preserves PNG MIME if the browser cannot encode WebP', async () => {
		const bitmap = { width: 120, height: 60, close: jest.fn() };
		Object.defineProperty(globalThis, 'createImageBitmap', {
			configurable: true,
			value: jest.fn().mockResolvedValue(bitmap),
		});
		const drawImage = jest.fn();
		jest
			.spyOn(HTMLCanvasElement.prototype, 'getContext')
			.mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
		jest
			.spyOn(HTMLCanvasElement.prototype, 'toBlob')
			.mockImplementationOnce((callback) => callback(new Blob([new Uint8Array(170 * 1024)], { type: 'image/webp' })))
			.mockImplementationOnce((callback) => callback(new Blob(['small'], { type: 'image/png' })));
		const converted = await prepareCardCoverImage(new File(['original'], 'plan.jpg', { type: 'image/jpeg' }));
		expect(converted.type).toBe('image/png');
		expect(converted.name).toBe('plan-card.png');
		expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 120, 60);
		expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(2);
	});

	it('releases decoded memory when encoding fails', async () => {
		const bitmap = { width: 120, height: 60, close: jest.fn() };
		Object.defineProperty(globalThis, 'createImageBitmap', {
			configurable: true,
			value: jest.fn().mockResolvedValue(bitmap),
		});
		jest
			.spyOn(HTMLCanvasElement.prototype, 'getContext')
			.mockReturnValue({ drawImage: jest.fn() } as unknown as CanvasRenderingContext2D);
		jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null));
		await expect(prepareCardCoverImage(new File(['original'], 'plan.png', { type: 'image/png' }))).rejects.toThrow(
			'conversion failed',
		);
		expect(bitmap.close).toHaveBeenCalled();
	});

	it('rejects non-image files', async () => {
		const file = new File(['text'], 'notes.txt', { type: 'text/plain' });

		await expect(prepareCardCoverImage(file)).rejects.toThrow('not an image');
	});
});
