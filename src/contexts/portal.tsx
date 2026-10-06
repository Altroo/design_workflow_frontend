'use client';

import { Suspense, use, useState, type FC, type ReactNode } from 'react';
import { browser, createPortal } from 'react-dom';

interface PortalProps {
	id: string;
	children: ReactNode;
}

const PortalContent: FC<PortalProps> = ({ id, children }) => {
	use(browser());
	const [existingContainer] = useState(() => document.getElementById(id));

	return createPortal(
		existingContainer ? (
			children
		) : (
			<div
				id={id}
				style={{
					position: 'fixed',
					bottom: 20,
					left: 20,
					zIndex: 9999,
					width: 'auto',
					maxWidth: '100vw',
					pointerEvents: 'none',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
				}}
			>
				{children}
			</div>
		),
		existingContainer ?? document.body,
	);
};

const Portal: FC<PortalProps> = ({ id, children }) => (
	<Suspense fallback={null}>
		<PortalContent key={id} id={id}>
			{children}
		</PortalContent>
	</Suspense>
);

export default Portal;
