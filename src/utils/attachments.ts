// Keep aligned with MAX_ATTACHMENT_UPLOAD_SIZE and the API proxy's 11G request limit.
export const MAX_ATTACHMENT_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024;

export const attachmentsExceedLimit = (files: readonly Pick<File, 'size'>[]) =>
	files.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_UPLOAD_SIZE;
