import React from 'react';

type Props = {
	buttonText: string;
	startIcon?: React.ReactNode;
	onClick?: () => void;
	cssClass?: string;
	disabled?: boolean;
	children?: React.ReactNode;
};

const TextButton: React.FC<Props> = (props: Props) => {
	return (
		<button
			type="button"
			className={['inline-flex items-center gap-2 text-sm font-medium text-[var(--ink-soft)] transition hover:text-[var(--ink)]', props.cssClass ?? ''].join(' ')}
			disabled={props.disabled}
			onClick={props.onClick}
		>
			{props.startIcon}
			<span>{props.buttonText}</span>
		</button>
	);
};

export default TextButton;
