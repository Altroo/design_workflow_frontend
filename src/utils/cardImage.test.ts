import { CARD_IMAGE_CONVERSION_THRESHOLD, prepareCardCoverImage } from './cardImage';

describe('prepareCardCoverImage', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		Reflect.deleteProperty(globalThis, 'createImageBitmap');
	});

	it('keeps normal card images unchanged', async () => {
		const file = new File(['small'], 'small.png', { type: 'image/png' });

		await expect(prepareCardCoverImage(file)).resolves.toBe(file);
	});

	it('converts oversized images to a compressed card-sized JPEG', async () => {
		const file = new File(['large'], 'room-render.png', { type: 'image/png', lastModified: 123 });
		Object.defineProperty(file, 'size', { value: CARD_IMAGE_CONVERSION_THRESHOLD + 1 });
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
			callback(new Blob(['compressed'], { type: 'image/jpeg' }));
		});

		const converted = await prepareCardCoverImage(file);

		expect(converted).not.toBe(file);
		expect(converted.name).toBe('room-render-card.jpg');
		expect(converted.type).toBe('image/jpeg');
		expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2560, 1280);
		expect(fillRect).toHaveBeenCalledWith(0, 0, 2560, 1280);
		expect(bitmap.close).toHaveBeenCalled();
	});

	it('rejects non-image files', async () => {
		const file = new File(['text'], 'notes.txt', { type: 'text/plain' });

		await expect(prepareCardCoverImage(file)).rejects.toThrow('not an image');
	});
});
