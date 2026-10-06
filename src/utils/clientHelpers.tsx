'use client';

import { type ReactNode, useSyncExternalStore } from 'react';

type MediaQueryProps = {
	children: ReactNode;
};

const subscribeViewport = (onChange: () => void) => {
	window.addEventListener('resize', onChange);
	return () => window.removeEventListener('resize', onChange);
};
const getDesktopSnapshot = () => window.innerWidth >= 992;
// Neither branch renders on the server or during hydration.
const getServerSnapshot = () => null;
const useDesktopViewport = () => useSyncExternalStore(subscribeViewport, getDesktopSnapshot, getServerSnapshot);

/**
 * Desktop: only screen and (min-width: 992px)
 */
export const Desktop = ({ children }: MediaQueryProps) => {
	const isDesktop = useDesktopViewport();
	return isDesktop === true ? <>{children}</> : null;
};

/**
 * TabletAndMobile: only screen and (max-width: 991px)
 */
export const TabletAndMobile = ({ children }: MediaQueryProps) => {
	const isDesktop = useDesktopViewport();
	return isDesktop === false ? <>{children}</> : null;
};
