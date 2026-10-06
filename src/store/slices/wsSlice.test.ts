import reducer, { setWSMaintenance, setWSOnlineUsers, setWSConnectionStatus, setWSServerVersion } from './wsSlice';
import { APP_VERSION } from '@/utils/appVersion';

describe('wsSlice reducer', () => {
	it('should return the initial state when passed an empty action', () => {
		const result = reducer(undefined, { type: '' });
		expect(result).toEqual({
			localVersion: APP_VERSION,
			serverVersion: null,
			maintenance: false,
			onlineUserIds: [],
			connectionStatus: 'connecting',
		});
	});

	it('should handle setWSMaintenance', () => {
		const result = reducer(undefined, setWSMaintenance(true));
		expect(result).toEqual({
			localVersion: APP_VERSION,
			serverVersion: null,
			maintenance: true,
			onlineUserIds: [],
			connectionStatus: 'connecting',
		});
	});

	it('should handle setWSOnlineUsers', () => {
		const result = reducer(undefined, setWSOnlineUsers([3, 1, 3]));
		expect(result).toEqual({
			localVersion: APP_VERSION,
			serverVersion: null,
			maintenance: false,
			onlineUserIds: [1, 3],
			connectionStatus: 'connecting',
		});
	});

	it('clears stale online users while reconnecting', () => {
		const online = reducer(undefined, setWSOnlineUsers([1, 2]));
		expect(reducer(online, setWSConnectionStatus('reconnecting'))).toEqual({
			localVersion: APP_VERSION,
			serverVersion: null,
			maintenance: false,
			onlineUserIds: [],
			connectionStatus: 'reconnecting',
		});
	});

	it('keeps the loaded bundle version distinct from announcements, including rollbacks', () => {
		const state = reducer(undefined, setWSServerVersion('2.0.0'));
		expect(state).toMatchObject({ localVersion: APP_VERSION, serverVersion: '2.0.0' });
		expect(reducer(state, setWSServerVersion('1.0.0')).serverVersion).toBe('1.0.0');
	});
	it.each([undefined, null, 'invalid', 2])('ignores malformed versions: %s', (version) => {
		const state = reducer(undefined, setWSServerVersion('2.0.0'));
		expect(reducer(state, setWSServerVersion(version))).toEqual(state);
	});
});
