import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Middleware } from '@reduxjs/toolkit';
import { setupApiStore } from './setupApiStore';
import { emptyInitStateToken, setInitState } from './slices/_initSlice';

it('combines application and API state, runs queries, thunks and extra middleware', async () => {
	const api = createApi({
		reducerPath: 'testApi',
		baseQuery: fakeBaseQuery(),
		endpoints: (builder) => ({ value: builder.query<number, void>({ queryFn: () => ({ data: 42 }) }) }),
	});
	const observed = jest.fn();
	const middleware: Middleware = () => (next) => (action) => {
		observed(action);
		return next(action);
	};
	const result = setupApiStore(api, [middleware]);
	try {
		expect(result.api).toBe(api);
		expect(result.dispatch).toBe(result.store.dispatch);
		expect(result.store.getState()).toHaveProperty('_init');
		expect(result.store.getState()).toHaveProperty('account');
		expect(result.store.getState()).toHaveProperty('testApi');
		result.dispatch((dispatch) =>
			dispatch(setInitState({ initStateToken: { ...emptyInitStateToken, access: 'token' } })),
		);
		expect(result.store.getState()._init.initStateToken.access).toBe('token');
		expect(observed).toHaveBeenCalledWith(expect.objectContaining({ type: '_init/setInitState' }));
		await expect(result.dispatch(api.endpoints.value.initiate()).unwrap()).resolves.toBe(42);
	} finally {
		result.dispatch(api.util.resetApiState());
	}
});
