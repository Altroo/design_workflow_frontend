import React from 'react';
import type { CSSProperties } from 'react';

type Props = {
	cssStyle?: CSSProperties;
	children?: React.ReactNode;
	backdropColor: string;
	circularColor: string;
	backdropOpen?: boolean;
};

// '#FFFFFF'
const ApiProgress: React.FC<Props> = (props: Props) => {
	if (!props.backdropOpen && props.backdropOpen !== undefined) {
		return null;
	}

	return (
		<div
			style={{ backgroundColor: props.backdropColor, ...(props.cssStyle ?? {}) }}
			className="api-progress-overlay fixed inset-0 z-[100] flex items-center justify-center"
		>
			<div
				data-testid="api-loader"
				className="api-progress-spinner h-12 w-12 animate-spin rounded-full border-4 border-[color:var(--line)] border-t-[color:var(--accent)]"
				style={{ borderTopColor: props.circularColor }}
			/>
		</div>
	);
};

export default ApiProgress;
