'use client';

import { useEffect, useRef, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';

// Portal keeps the preview outside nested forms, popovers and card overflow areas.
const AiAssistantDialog = (props: ComponentProps<typeof ActionModals>) => {
	const root = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const previousFocus = document.activeElement;
		root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
		return () => {
			if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
		};
	}, []);
	return createPortal(
		<div
			ref={root}
			className="workflow-ai-dialog"
			onClick={(event) => event.stopPropagation()}
			onPointerDown={(event) => event.stopPropagation()}
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					props.onClose?.();
				}
				if (event.key !== 'Tab') return;
				const buttons = root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
				if (!buttons?.length) return;
				const first = buttons[0];
				const last = buttons[buttons.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}
			}}
		>
			<ActionModals {...props} />
		</div>,
		document.body,
	);
};

export default AiAssistantDialog;
