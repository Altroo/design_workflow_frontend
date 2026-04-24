'use client';

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Language } from '@/types/languageTypes';
import { translations } from '@/translations';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child
 * component tree and display a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log error to monitoring service in production
		if (process.env.NODE_ENV === 'production') {
			// Could integrate with Sentry, LogRocket, etc.
			// For now, just suppress the error in production
		} else {
			// In development, log to console for debugging
			console.error('ErrorBoundary caught an error:', error, errorInfo);
		}
	}

	handleReset = (): void => {
		this.setState({ hasError: false, error: null });
	};

	private getTranslations() {
		const stored = typeof window !== 'undefined' ? localStorage.getItem('app-language') : null;
		const lang: Language = stored === 'en' ? 'en' : 'fr';
		return translations[lang];
	}

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const t = this.getTranslations();

			return (
				<div className="flex min-h-[400px] items-center justify-center p-4">
					<div className="app-card max-w-[500px] border border-[color:var(--line-strong)] bg-white p-6 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--ink)]">
							<AlertTriangle className="h-8 w-8" />
						</div>
						<h2 className="text-2xl font-semibold text-[var(--ink)]">{t.errors.errorOccurred}</h2>
						<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{t.errors.errorApology}</p>
						{process.env.NODE_ENV !== 'production' && this.state.error && (
							<pre className="mt-4 max-h-[150px] overflow-auto rounded-2xl bg-[var(--surface-muted)] p-3 text-left text-xs text-[var(--ink-soft)]">
								{this.state.error.message}
							</pre>
						)}
						<div className="mt-5 flex justify-center gap-3">
							<button type="button" className="app-button" onClick={this.handleReset}>
								{t.common.retry}
							</button>
							<button
								type="button"
								className="app-pill border border-[color:var(--line-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
								onClick={() => window.location.reload()}
							>
								{t.common.refresh}
							</button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
