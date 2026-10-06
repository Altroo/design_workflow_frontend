import { jest } from '@jest/globals';
import type { Middleware } from '@reduxjs/toolkit';
import type { SagaStore, RootState, AppDispatch } from './store';

jest.mock('@/store/slices/_initSlice', () => ({
	__esModule: true,
	default: (state = { init: true }) => state,
}));
jest.mock('@/store/slices/accountSlice', () => ({
	__esModule: true,
	default: (state = { account: true }) => state,
}));

function makeApiMock(name: string) {
	const dummyMiddleware: Middleware = () => (next) => (action) => next(action);
	return {
		reducerPath: name,
		reducer: (state = {}) => state,
		middleware: dummyMiddleware,
	};
}

jest.mock('@/store/services/account', () => ({
	__esModule: true,
	accountApi: makeApiMock('accountApi'),
	profilApi: makeApiMock('profilApi'),
	usersApi: makeApiMock('usersApi'),
}));

jest.mock('@/store/sagas', () => ({
	__esModule: true,
	rootSaga: function* rootSaga() {
		// no-op for store wiring tests
	},
}));

describe('makeStore', () => {
	let store: SagaStore;
	let dispatch: AppDispatch;

	beforeEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { makeStore } = require('./store') as { makeStore: () => SagaStore };
		store = makeStore();
		dispatch = store.dispatch as AppDispatch;
	});

	afterEach(() => {
		if (store?.sagaTask) {
			store.sagaTask.cancel();
		}
	});

	it('creates a store with the expected initial state shape', () => {
		const state = store.getState() as RootState;
		expect(state).toHaveProperty('_init');
		expect(state).toHaveProperty('account');
		expect(state).toHaveProperty('accountApi');
		expect(state).toHaveProperty('profilApi');
		expect(state).toHaveProperty('usersApi');
	});

	it('store has a sagaTask set after makeStore', () => {
		expect(store.sagaTask).toBeDefined();
	});

	it('dispatch is available', () => {
		expect(typeof dispatch).toBe('function');
	});

	it('keeps RTK Query file arguments excluded using the default action paths', () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {});
		try {
			dispatch({ type: 'query/upload', meta: { arg: new File(['test'], 'test.txt'), baseQueryMeta: new Date() } });
			expect(error).not.toHaveBeenCalled();
		} finally {
			error.mockRestore();
		}
	});

	it('still detects non-serializable application payloads and unused persist actions', () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {});
		try {
			dispatch({ type: 'persist/PERSIST', payload: { timestamp: new Date() } });
			expect(error).toHaveBeenCalled();
			expect(String(error.mock.calls[0][0])).toContain('payload.timestamp');
		} finally {
			error.mockRestore();
		}
	});
});
