import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

type http = 'http' | 'https' | undefined;

// Remote patterns for production API
const remotePatterns: RemotePattern[] = [
	{
		protocol: 'https',
		hostname: 'design-workflow-api.elbouazzatiholding.ma',
		port: '',
		pathname: '/media/**',
		search: '',
	},
	{
		protocol: 'http',
		hostname: 'design-workflow-api.elbouazzatiholding.ma',
		port: '',
		pathname: '/media/**',
		search: '',
	},
];

// Add localhost for development
if (isDev && process.env.NEXT_PUBLIC_API_ROOT_URL) {
	const port = process.env.NEXT_PUBLIC_API_ROOT_PORT;
	const shouldIncludePort = port && port !== '80' && port !== '443';

	remotePatterns.push({
		protocol: process.env.NEXT_PUBLIC_HTTP_PROTOCOLE as http,
		hostname: process.env.NEXT_PUBLIC_API_ROOT_URL as string,
		...(shouldIncludePort && { port }),
		pathname: '/media/**',
	});
}

const nextConfig: NextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	poweredByHeader: false,
	compress: false,
	typedRoutes: true,

	experimental: {
		typedEnv: true,
		turbopackFileSystemCacheForDev: true,
		optimizeCss: isProd,
	},

	sassOptions: {
		includePaths: [path.join(__dirname, 'src', 'styles'), path.join(__dirname, 'public')],
	},

	images: {
		unoptimized: isDev,
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60,
		remotePatterns,
		dangerouslyAllowLocalIP: isProd,
	},

	async headers() {
		return [
			{
				source: '/assets/ico/manifest.json',
				headers: [
					{ key: 'Content-Type', value: 'application/manifest+json' },
					{ key: 'Cache-Control', value: 'public, max-age=604800, immutable' },
				],
			},
			{
				source: '/assets/fonts/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
					{ key: 'Access-Control-Allow-Origin', value: '*' },
				],
			},
			{
				source: '/assets/images/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
			{
				source: '/assets/ico/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
			{
				source: '/assets/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
			{
				source: '/(.*)',
				headers: [
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{ key: 'X-XSS-Protection', value: '1; mode=block' },
					{ key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
					{
						key: 'Content-Security-Policy',
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
							"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
							"font-src 'self' https://fonts.gstatic.com data:",
						`img-src 'self' https://design-workflow-api.elbouazzatiholding.ma data: blob:${isDev ? ' http://localhost:8004 http://127.0.0.1:8004' : ''}`,
						`media-src 'self' https://design-workflow-api.elbouazzatiholding.ma blob:${isDev ? ' http://localhost:8004 http://127.0.0.1:8004' : ''}`,
						`connect-src 'self' https://design-workflow-api.elbouazzatiholding.ma wss://design-workflow-api.elbouazzatiholding.ma${isDev ? ' http://localhost:8004 http://127.0.0.1:8004 ws://localhost:8004 ws://127.0.0.1:8004' : ''}`,

							"frame-ancestors 'self'",
							"base-uri 'self'",
							"form-action 'self'",
						].join('; '),
					},
				],
			},
		];
	},
};

export default nextConfig;
