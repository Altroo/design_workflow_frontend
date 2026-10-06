import { attachmentsExceedLimit, MAX_ATTACHMENT_UPLOAD_SIZE } from './attachments';

describe('attachment size validation', () => {
	it('accepts a file exactly at the 10 GB limit and rejects one byte more', () => {
		expect(MAX_ATTACHMENT_UPLOAD_SIZE).toBe(10 * 1024 ** 3);
		expect(attachmentsExceedLimit([{ size: MAX_ATTACHMENT_UPLOAD_SIZE }])).toBe(false);
		expect(attachmentsExceedLimit([{ size: MAX_ATTACHMENT_UPLOAD_SIZE + 1 }])).toBe(true);
	});

	it('detects a chat batch over the request limit', () => {
		expect(attachmentsExceedLimit([{ size: 6 * 1024 ** 3 }, { size: 6 * 1024 ** 3 }])).toBe(true);
		expect(attachmentsExceedLimit([{ size: 70 * 1024 ** 2 }])).toBe(false);
	});
});
