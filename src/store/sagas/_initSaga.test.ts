import { runSaga } from 'redux-saga';
import * as Types from '../actions';
import {
	initAppSaga,
	initMaintenanceSaga,
	initAppSessionTokensSaga,
	refreshAppTokenStatesSaga,
	watchInit,
} from './_initSaga';
import { setInitState } from '../slices/_initSlice';
import type { InitStateInterface, InitStateToken } from '@/types/_initTypes';
import { takeLatest } from 'redux-saga/effects';
import { getApi } from '@/utils/apiHelpers';
import { allowAnyInstance } from '@/utils/helpers';
import { setWSMaintenance, setWSServerVersion } from '../slices/wsSlice';

jest.mock('@/utils/apiHelpers', () => ({ getApi: jest.fn() }));
jest.mock('@/utils/helpers', () => ({ allowAnyInstance: jest.fn(() => ({})) }));

describe('maintenance startup', () => {
	const originalEnv = process.env;
	beforeEach(() => {
		process.env = { ...originalEnv };
		jest.clearAllMocks();
	});
	afterEach(() => {
		process.env = originalEnv;
	});

	it('skips maintenance requests when no endpoint is configured', async () => {
		Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_WS_MAINTENANCE_ROOT');
		Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
		await runSaga({}, initAppSaga).toPromise();
		expect(getApi).not.toHaveBeenCalled();
	});

	it('uses the shared API host when no separate maintenance URL is configured', async () => {
		Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_WS_MAINTENANCE_ROOT');
		process.env.NEXT_PUBLIC_API_URL = 'https://api.test';
		jest.mocked(getApi).mockResolvedValueOnce({ status: 200, data: { maintenance: false, version: '1.0.0' } });
		await runSaga({ dispatch: jest.fn() }, initAppSaga).toPromise();
		expect(getApi).toHaveBeenCalledWith('https://api.test/api/ws/maintenance/', {});
	});

	it.each([true, false])('initializes maintenance=%s from the public endpoint', async (maintenance) => {
		process.env.NEXT_PUBLIC_WS_MAINTENANCE_ROOT = '/maintenance/';
		jest.mocked(getApi).mockResolvedValueOnce({ status: 200, data: { maintenance } });
		const dispatch = jest.fn();
		await runSaga({ dispatch }, initAppSaga).toPromise();
		expect(allowAnyInstance).toHaveBeenCalledTimes(1);
		expect(getApi).toHaveBeenCalledWith('/maintenance/', {});
		expect(dispatch).toHaveBeenCalledWith(setWSMaintenance(maintenance));
	});

	it('does not replace maintenance state after a non-success response', async () => {
		process.env.NEXT_PUBLIC_WS_MAINTENANCE_ROOT = '/maintenance/';
		jest.mocked(getApi).mockResolvedValueOnce({ status: 503, data: {} });
		const dispatch = jest.fn();
		await runSaga({ dispatch }, initMaintenanceSaga).toPromise();
		expect(dispatch).not.toHaveBeenCalled();
	});

	it('initializes the announced version independently of maintenance', async () => {
		process.env.NEXT_PUBLIC_WS_MAINTENANCE_ROOT = '/maintenance/';
		jest.mocked(getApi).mockResolvedValueOnce({ status: 200, data: { maintenance: false, version: '1.10.0' } });
		const dispatch = jest.fn();
		await runSaga({ dispatch }, initMaintenanceSaga).toPromise();
		expect(dispatch).toHaveBeenCalledWith(setWSServerVersion('1.10.0'));
		expect(dispatch).toHaveBeenCalledWith(setWSMaintenance(false));
	});

	it('keeps initialization alive when offline so subsequent checks can recover', async () => {
		process.env.NEXT_PUBLIC_WS_MAINTENANCE_ROOT = '/maintenance/';
		jest.mocked(getApi).mockRejectedValueOnce(new Error('offline'));
		const dispatch = jest.fn();
		await expect(runSaga({ dispatch }, initAppSaga).toPromise()).resolves.toBeUndefined();
		expect(dispatch).not.toHaveBeenCalled();
	});
});

describe('init sagas', () => {
	it('initAppSessionTokensSaga dispatches setInitState with correct payload', async () => {
		const mockSession = {
			user: {
				pk: 1,
				email: 'test@example.com',
				first_name: 'John',
				last_name: 'Doe',
				id: '',
				emailVerified: null as null,
				name: '',
			},
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
			accessTokenExpiration: '2025-01-01',
			refreshTokenExpiration: '2025-01-02',
			expires: '2025-01-03',
		};

		const dispatched: unknown[] = [];
		await runSaga({ dispatch: (action: unknown) => dispatched.push(action) }, initAppSessionTokensSaga, {
			type: Types.INIT_APP_SESSION_TOKENS,
			session: mockSession as never,
		}).toPromise();

		const expectedToken: InitStateToken = {
			user: mockSession.user,
			access: mockSession.accessToken,
			refresh: mockSession.refreshToken,
			access_expiration: mockSession.accessTokenExpiration,
			refresh_expiration: mockSession.refreshTokenExpiration,
		};

		const expectedAppToken: InitStateInterface<InitStateToken> = {
			initStateToken: expectedToken,
		};

		expect(dispatched).toEqual([setInitState(expectedAppToken)]);
	});

	it('initAppSessionTokensSaga accepts access token from session.user', async () => {
		const mockSession = {
			user: {
				pk: 1,
				email: 'test@example.com',
				first_name: 'John',
				last_name: 'Doe',
				accessToken: 'nested-access-token',
				id: '',
				emailVerified: null as null,
				name: '',
			},
			accessToken: '',
			refreshToken: 'refresh-token',
			accessTokenExpiration: '2025-01-01',
			refreshTokenExpiration: '2025-01-02',
			expires: '2025-01-03',
		};

		const dispatched: unknown[] = [];
		await runSaga({ dispatch: (action: unknown) => dispatched.push(action) }, initAppSessionTokensSaga, {
			type: Types.INIT_APP_SESSION_TOKENS,
			session: mockSession as never,
		}).toPromise();

		expect(dispatched).toEqual([
			setInitState({
				initStateToken: {
					user: mockSession.user,
					access: 'nested-access-token',
					refresh: mockSession.refreshToken,
					access_expiration: mockSession.accessTokenExpiration,
					refresh_expiration: mockSession.refreshTokenExpiration,
				},
			}),
		]);
	});

	it('refreshAppTokenStatesSaga dispatches setInitState with correct payload', async () => {
		const payload = {
			type: Types.REFRESH_APP_TOKEN_STATES,
			session: {
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
				accessTokenExpiration: '2025-02-01',
				refreshTokenExpiration: '2025-02-02',
				user: {
					pk: 2,
					email: 'jane@example.com',
					first_name: 'Jane',
					last_name: 'Smith',
				},
			},
		};

		const dispatched: unknown[] = [];
		await runSaga(
			{ dispatch: (action: unknown) => dispatched.push(action) },
			refreshAppTokenStatesSaga,
			payload,
		).toPromise();

		const expectedToken: InitStateToken = {
			access: 'new-access',
			refresh: 'new-refresh',
			user: { pk: 2, email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith' },
			access_expiration: '2025-02-01',
			refresh_expiration: '2025-02-02',
		};

		expect(dispatched).toEqual([setInitState({ initStateToken: expectedToken })]);
	});

	it('watchInit uses takeLatest for INIT and REFRESH actions', () => {
		const gen = watchInit();

		const firstEffect = gen.next().value;
		expect(firstEffect).toEqual(takeLatest(Types.INIT_APP, initAppSaga));

		const secondEffect = gen.next().value;
		expect(secondEffect).toEqual(takeLatest(Types.INIT_APP_SESSION_TOKENS, initAppSessionTokensSaga));

		const thirdEffect = gen.next().value;
		expect(thirdEffect).toEqual(takeLatest(Types.REFRESH_APP_TOKEN_STATES, refreshAppTokenStatesSaga));
	});
});
