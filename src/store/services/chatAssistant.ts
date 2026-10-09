import { getSession } from 'next-auth/react';
import { handleUnauthorized } from '@/utils/helpers';

export class ChatAPIError extends Error {
	constructor(public code: string) {
		super(code);
	}
}

export const chatRequest = async (path: string, token: string, init: RequestInit = {}) => {
	const streaming = new Headers(init.headers).get('Accept') === 'text/event-stream';
	const timeout = AbortSignal.timeout(streaming ? 125000 : 5000);
	const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
	const request = (access: string) =>
		fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat-ai/${path}`, {
			...init,
			signal,
			cache: 'no-store',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}`, ...init.headers },
		});
	let response = await request(token);
	if (response.status === 401) {
		const fresh = await getSession();
		if (fresh?.accessToken && fresh.accessToken !== token) response = await request(fresh.accessToken);
		if (response.status === 401) {
			await handleUnauthorized();
			throw new ChatAPIError('NOT_AUTHENTICATED');
		}
	}
	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		throw new ChatAPIError(
			data.error?.code ||
				(response.status === 429 ? 'BUSY' : response.status === 403 ? 'PERMISSION_DENIED' : 'APPLICATION_UNAVAILABLE'),
		);
	}
	return response;
};

export const consumeChatStream = async (response: Response, receive: (event: string, data: unknown) => void) => {
	if (!response.body) throw new ChatAPIError('INCOMPLETE_RESPONSE');
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '',
		size = 0,
		completed = false;
	try {
		while (!completed) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 500000) throw new ChatAPIError('INVALID_MODEL_OUTPUT');
			buffer += decoder.decode(value, { stream: true });
			let boundary: number;
			while ((boundary = buffer.indexOf('\n\n')) !== -1) {
				const block = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				const event = block
					.split('\n')
					.find((line) => line.startsWith('event: '))
					?.slice(7);
				const data = block
					.split('\n')
					.filter((line) => line.startsWith('data: '))
					.map((line) => line.slice(6))
					.join('\n');
				if (!event || !data) continue;
				let payload: unknown;
				try {
					payload = JSON.parse(data);
				} catch {
					throw new ChatAPIError('INVALID_MODEL_OUTPUT');
				}
				if (event === 'error') throw new ChatAPIError((payload as { code?: string }).code || 'INTERNAL_ERROR');
				receive(event, payload);
				if (event === 'message.completed') {
					completed = true;
					break;
				}
			}
		}
		if (!completed) throw new ChatAPIError('INCOMPLETE_RESPONSE');
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
};
