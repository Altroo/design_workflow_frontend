'use client';

import React, { ForwardedRef, forwardRef } from 'react';
import Link from 'next/link';
import type { UrlObject } from 'url';

type Props = {
	buttonText: string;
	active: boolean;
	nextPage: string | UrlObject;
	startIcon?: React.ReactNode;
	onClick?: () => void;
	anchorcssClass?: string;
	cssClass?: string;
	scroll?: boolean;
	shallow?: boolean;
	replace?: boolean;
	type?: 'submit' | 'reset' | 'button' | undefined;
	children?: React.ReactNode;
};

const PrimaryAnchorButton = forwardRef<HTMLAnchorElement, Props>(
	(props: Props, ref: ForwardedRef<HTMLAnchorElement>) => {
		return (
			<Link
				href={props.nextPage}
				scroll={props.scroll}
				shallow={props.shallow}
				replace={props.replace}
				ref={ref}
				aria-disabled={!props.active}
				onClick={(event) => {
					if (!props.active) {
						event.preventDefault();
						return;
					}
					props.onClick?.();
				}}
				className={[
					'inline-flex',
					props.anchorcssClass ?? '',
					!props.active ? 'pointer-events-none opacity-60' : '',
				].join(' ')}
			>
				<span
					className={[
						'app-button ui-button-primary',
						props.cssClass ?? '',
						!props.active ? 'opacity-60' : '',
					].join(' ')}
				>
					{props.startIcon}
					<span>{props.buttonText}</span>
				</span>
			</Link>
		);
	},
);
PrimaryAnchorButton.displayName = 'PrimaryAnchorButton';

export default PrimaryAnchorButton;
