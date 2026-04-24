'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useIsClient } from '@/utils/hooks';

type MediaQueryProps = {
	children: ReactNode;
};

/**
 * Desktop: only screen and (min-width: 992px)
 */
export const Desktop = ({ children }: MediaQueryProps) => {
	const isClient = useIsClient();
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const update = () => setIsDesktop(window.innerWidth >= 992);
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);

	// Return null on server to match initial client render
	if (!isClient) {
		return null;
	}

	return isDesktop ? <>{children}</> : null;
};

/**
 * TabletAndMobile: only screen and (max-width: 991px)
 */
export const TabletAndMobile = ({ children }: MediaQueryProps) => {
	const isClient = useIsClient();
	const [isTabletMobile, setIsTabletMobile] = useState(false);

	useEffect(() => {
		const update = () => setIsTabletMobile(window.innerWidth < 992);
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);

	// Return null on server to match initial client render
	if (!isClient) {
		return null;
	}

	return isTabletMobile ? <>{children}</> : null;
};
