export const runWithCleanup = async <T>(action: () => Promise<T>, cleanup: () => void): Promise<T> => {
	try {
		return await action();
	} finally {
		cleanup();
	}
};

export const runWithErrorHandler = (action: () => void, onError: () => void): void => {
	try {
		action();
	} catch {
		onError();
	}
};

export const runAsyncWithErrorHandler = async (
	action: () => Promise<void>,
	onError: (error: unknown) => void,
): Promise<void> => {
	try {
		await action();
	} catch (error) {
		onError(error);
	}
};
