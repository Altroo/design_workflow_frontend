import createSagaMiddleware, { type Task } from 'redux-saga';
import { combineReducers, configureStore, ThunkDispatch } from '@reduxjs/toolkit';
import type { Store, Action } from '@reduxjs/toolkit';
import { rootSaga } from '@/store/sagas';
import _initReducer from '@/store/slices/_initSlice';
import accountReducer from '@/store/slices/accountSlice';
import wsReducer from '@/store/slices/wsSlice';
import { accountApi, profilApi, usersApi } from '@/store/services/account';
import { designWorkflowApi } from '@/store/services/designWorkflow';

const rootReducer = combineReducers({
	_init: _initReducer,
	account: accountReducer,
	ws: wsReducer,
	[accountApi.reducerPath]: accountApi.reducer,
	[profilApi.reducerPath]: profilApi.reducer,
	[usersApi.reducerPath]: usersApi.reducer,
	[designWorkflowApi.reducerPath]: designWorkflowApi.reducer,
});

export interface SagaStore extends Store {
	sagaTask?: Task;
}

const reducers = (state: ReturnType<typeof rootReducer> | undefined, action: Action) => {
	return rootReducer(state, action);
};

export const makeStore = (): SagaStore => {
	const sagaMw = createSagaMiddleware();
	const s = configureStore({
		reducer: reducers,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				serializableCheck: {
					ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
					ignoredPaths: ['meta.arg', 'meta.baseQueryMeta', 'payload.timestamp'],
				},
				thunk: true,
			})
				.prepend(sagaMw)
				.concat(
					accountApi.middleware,
					profilApi.middleware,
					usersApi.middleware,
					designWorkflowApi.middleware,
				),
		devTools: process.env.NODE_ENV !== 'production',
	}) as SagaStore;
	s.sagaTask = sagaMw.run(rootSaga);
	return s;
};

export const store: SagaStore = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch & ThunkDispatch<RootState, unknown, Action>;
