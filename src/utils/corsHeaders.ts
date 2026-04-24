// change on production to specific domains
const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean)
	|| (process.env.NODE_ENV !== 'production' ? ['http://localhost:3004'] : ['https://example.elbouazzatiholding.ma']);

export const getCorsHeaders = (origin: string | null): HeadersInit => {
	const headers: HeadersInit = {
		'Access-Control-Allow-Methods': 'GET, HEAD, PUT, PATCH, POST, DELETE',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Credentials': 'true',
	};

	if (origin && allowedOrigins.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
	}

	return headers;
};

export function addCorsHeaders(response: Response, origin: string | null): Response {
	const corsHeaders = getCorsHeaders(origin);
	const headers = new Headers(response.headers);

	Object.entries(corsHeaders).forEach(([key, value]) => {
		headers.set(key, value as string);
	});

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
