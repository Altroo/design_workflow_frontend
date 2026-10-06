'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { setupListeners } from '@reduxjs/toolkit/query';
import { Provider } from 'react-redux';
import { makeStore, type SagaStore } from '@/store/store';

const StoreProvider = ({ children }: { children: ReactNode }) => {
	const [store] = useState<SagaStore>(() => makeStore());
	useEffect(() => setupListeners(store.dispatch), [store]);
	return <Provider store={store}>{children}</Provider>;
};

export default StoreProvider;
