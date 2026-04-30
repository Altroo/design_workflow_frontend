'use client';

import React from 'react';
import { useLanguage } from '@/utils/hooks';

type Props = {
	errorDetails?: Record<string, string[]> | { error: string[] } | null;
	cssStyle?: React.CSSProperties;
	children?: React.ReactNode;
};

const ApiAlert: React.FC<Props> = (props: Props) => {
	const { t } = useLanguage();
	const errorDetails = props.errorDetails;
	const errorMessage: Array<Record<string, Array<string>>> = [];

	if (errorDetails) {
		if ('error' in errorDetails) {
			errorMessage.push({ error: errorDetails.error });
		} else if (typeof errorDetails === 'object') {
			const errorResult: Record<string, Array<string>> = {};
			for (const [key, value] of Object.entries(errorDetails)) {
				if (!errorResult[key]) {
					errorResult[key] = [];
				}
				if (Array.isArray(value)) {
					value.map((singleError) => {
						errorResult[key].push(singleError);
					});
				} else {
					errorResult[key].push(String(value));
				}
				errorMessage.push(errorResult);
			}
		}
	}

	return (
		<div className="ui-alert rounded-[14px] border border-[color:var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)]" style={props.cssStyle}>
			{errorMessage.length > 0
				? errorMessage.map((error) => {
						return Object.keys(error).map((k) => {
							return `${k} : ${error[k]}`;
						});
					})
				: t.errors.genericError}
		</div>
	);
};

export default ApiAlert;
