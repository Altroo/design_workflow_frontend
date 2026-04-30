import React from 'react';

type Props = {
	buttonText: string;
	loading: boolean;
	onClick?: React.MouseEventHandler<HTMLButtonElement> | (() => void);
	active?: boolean;
	type?: 'submit' | 'reset' | 'button' | undefined;
	startIcon?: React.ReactNode;
	cssClass?: string;
	children?: React.ReactNode;
};

const PrimaryLoadingButton: React.FC<Props> = (props: Props) => {
	return (
		<button
			onClick={props.onClick as React.MouseEventHandler<HTMLButtonElement>}
			className={['app-button ui-button-primary', props.cssClass ?? ''].join(' ')}
			disabled={!props.active || props.loading}
			type={props.type}
		>
			{props.startIcon}
			<span>{props.loading ? 'Loading...' : props.buttonText}</span>
		</button>
	);
};

export default PrimaryLoadingButton;
