/** @jest-environment node */
import { getSession } from 'next-auth/react';
import { handleUnauthorized } from '@/utils/helpers';
import { chatRequest, consumeChatStream } from './chatAssistant';
jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));
jest.mock('@/utils/helpers', () => ({ handleUnauthorized: jest.fn() }));
const originalFetch = global.fetch;
afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

it('refreshes an expired token once, preserves abort and disables caching', async () => {
	const fetch = jest
		.fn()
		.mockResolvedValueOnce(new Response('{}', { status: 401 }))
		.mockResolvedValueOnce(new Response('{}'));
	global.fetch = fetch;
	jest.mocked(getSession).mockResolvedValue({ accessToken: 'fresh' } as Awaited<ReturnType<typeof getSession>>);
	await chatRequest('capabilities/', 'old');
	expect(fetch).toHaveBeenCalledTimes(2);
	expect(fetch.mock.calls[1][1]).toEqual(
		expect.objectContaining({
			cache: 'no-store',
			signal: expect.any(AbortSignal),
			headers: expect.objectContaining({ Authorization: 'Bearer fresh' }),
		}),
	);
	expect(handleUnauthorized).not.toHaveBeenCalled();
});
it('ends unauthorized sessions and returns friendly codes rather than raw backend errors', async () => {
	global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 401 }));
	jest.mocked(getSession).mockResolvedValue(null);
	await expect(chatRequest('capabilities/', 'old')).rejects.toMatchObject({ code: 'NOT_AUTHENTICATED' });
	expect(handleUnauthorized).toHaveBeenCalledTimes(1);
	global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 429 }));
	await expect(chatRequest('capabilities/', 'valid')).rejects.toMatchObject({ code: 'BUSY' });
});
it('parses split UTF-8 SSE frames, ignores comments and requires completion', async () => {
	const encoded = new TextEncoder().encode(
		': ping\n\nevent: message.delta\ndata: {"text":"Équipe"}\n\nevent: message.completed\ndata: {"id":"1"}\n\n',
	);
	const receive = jest.fn();
	const stream = new ReadableStream({
		start(controller) {
			for (const byte of encoded) controller.enqueue(new Uint8Array([byte]));
			controller.close();
		},
	});
	await consumeChatStream(new Response(stream), receive);
	expect(receive.mock.calls).toEqual([
		['message.delta', { text: 'Équipe' }],
		['message.completed', { id: '1' }],
	]);
	await expect(
		consumeChatStream(new Response('event: message.delta\ndata: {"text":"cut"}\n\n'), jest.fn()),
	).rejects.toMatchObject({ code: 'INCOMPLETE_RESPONSE' });
});
it('rejects malformed, oversized and server-error streams', async () => {
	for (const [text, code] of [
		['event: error\ndata: {"code":"PERMISSION_DENIED"}\n\n', 'PERMISSION_DENIED'],
		['event: message.delta\ndata: not-json\n\n', 'INVALID_MODEL_OUTPUT'],
		['x'.repeat(500001), 'INVALID_MODEL_OUTPUT'],
	]) {
		await expect(consumeChatStream(new Response(text), jest.fn())).rejects.toMatchObject({ code });
	}
});
