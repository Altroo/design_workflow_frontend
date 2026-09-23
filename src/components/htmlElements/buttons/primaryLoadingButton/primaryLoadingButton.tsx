import {type FC, type MouseEventHandler, type ReactNode} from 'react';

type Props = {
	buttonText: string;
	loading: boolean;
	onClick?: MouseEventHandler<HTMLButtonElement> | (() => void);
	active?: boolean;
	type?: 'submit' | 'reset' | 'button' | undefined;
	startIcon?: ReactNode;
	cssClass?: string;
	children?: ReactNode;
};

const PrimaryLoadingButton: FC<Props> = (props: Props) => {
	return (
		<button
			onClick={props.onClick as MouseEventHandler<HTMLButtonElement>}
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
