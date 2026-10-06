'use client';

import type { ReactNode } from 'react';
import { catchError, type ErrorInfo } from 'next/error';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/utils/hooks';

interface ErrorFallbackProps {
	fallback?: ReactNode;
}

const ErrorFallback = ({ fallback }: ErrorFallbackProps, { error, retry }: ErrorInfo) => {
	const { t } = useLanguage();
	if (fallback !== undefined) return fallback;

	return (
		<div className="flex min-h-100 items-center justify-center p-4">
			<div className="app-card max-w-125 border border-(--line-strong) bg-white p-6 text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--surface-muted) text-(--ink)">
					<AlertTriangle className="h-8 w-8" />
				</div>
				<h2 className="text-2xl font-semibold text-(--ink)">{t.errors.errorOccurred}</h2>
				<p className="mt-3 text-sm leading-6 text-(--ink-soft)">{t.errors.errorApology}</p>
				{process.env.NODE_ENV !== 'production' && error instanceof Error && (
					<pre className="mt-4 max-h-37.5 overflow-auto rounded-2xl bg-(--surface-muted) p-3 text-left text-xs text-(--ink-soft)">
						{error.message}
					</pre>
				)}
				<div className="mt-5 flex justify-center gap-3">
					<button type="button" className="app-button" onClick={retry}>
						{t.common.retry}
					</button>
					<button
						type="button"
						className="app-pill border border-(--line-strong) px-4 py-3 text-sm font-medium text-(--ink)"
						onClick={() => window.location.reload()}
					>
						{t.common.refresh}
					</button>
				</div>
			</div>
		</div>
	);
};

export const ErrorBoundary = catchError(ErrorFallback);

export default ErrorBoundary;
