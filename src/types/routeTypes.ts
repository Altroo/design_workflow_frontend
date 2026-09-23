import type {ReactNode} from 'react';

export type RootLayoutProps = {children: ReactNode};
export type IdRouteProps = {params: Promise<{id: string}>};
