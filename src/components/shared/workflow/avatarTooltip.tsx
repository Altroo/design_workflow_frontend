'use client';

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export const AvatarTooltip = ({ name, children }: { name: string; children: ReactNode }) => {
	const [open, setOpen] = useState(false);
	const id = useId();
	const anchor = useRef<HTMLSpanElement>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const show = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		setOpen(true);
	};
	const hide = () => {
		if (document.activeElement === anchor.current) return;
		if (closeTimer.current) clearTimeout(closeTimer.current);
		closeTimer.current = setTimeout(() => setOpen(false), 120);
	};
	useEffect(
		() => () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		},
		[],
	);
	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Anchor asChild>
				<span
					ref={anchor}
					className="workflow-avatar-tooltip-trigger"
					role="button"
					tabIndex={0}
					data-no-card-open
					aria-label={name}
					aria-describedby={open ? id : undefined}
					onPointerEnter={(event) => {
						if (event.pointerType !== 'touch') show();
					}}
					onPointerLeave={hide}
					onFocus={show}
					onBlur={() => setOpen(false)}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						show();
					}}
					onKeyDown={(event) => {
						event.stopPropagation();
						if (event.key === 'Escape') setOpen(false);
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							show();
						}
					}}
				>
					{children}
				</span>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					id={id}
					role="tooltip"
					side="top"
					sideOffset={8}
					collisionPadding={12}
					className="workflow-avatar-tooltip"
					onPointerEnter={show}
					onPointerLeave={hide}
					onInteractOutside={(event) => {
						if (event.target instanceof Node && anchor.current?.contains(event.target)) event.preventDefault();
					}}
					onOpenAutoFocus={(event) => event.preventDefault()}
					onCloseAutoFocus={(event) => event.preventDefault()}
				>
					{name}
					<Popover.Arrow className="workflow-avatar-tooltip-arrow" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};
