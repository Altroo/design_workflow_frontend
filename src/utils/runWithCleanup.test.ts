import { runAsyncWithErrorHandler, runWithCleanup } from './runWithCleanup';

it('returns the action result and runs cleanup once', async () => {
	const cleanup = jest.fn();
	await expect(runWithCleanup(async () => 42, cleanup)).resolves.toBe(42);
	expect(cleanup).toHaveBeenCalledTimes(1);
});

it('cleans up after rejection without swallowing the original failure', async () => {
	const cleanup = jest.fn(),
		error = new Error('failed');
	await expect(
		runWithCleanup(async () => {
			throw error;
		}, cleanup),
	).rejects.toBe(error);
	expect(cleanup).toHaveBeenCalledTimes(1);
});

it('passes async failures to the error handler and leaves successful actions alone', async () => {
	const onError = jest.fn(),
		error = new Error('failed');
	await runAsyncWithErrorHandler(async () => {}, onError);
	expect(onError).not.toHaveBeenCalled();
	await runAsyncWithErrorHandler(async () => {
		throw error;
	}, onError);
	expect(onError).toHaveBeenCalledWith(error);
});
