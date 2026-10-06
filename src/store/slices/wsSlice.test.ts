import reducer, { setWSMaintenance, setWSOnlineUsers, setWSConnectionStatus } from './wsSlice';

describe('wsSlice reducer', () => {
	it('should return the initial state when passed an empty action', () => {
		const result = reducer(undefined, { type: '' });
		expect(result).toEqual({
			maintenance: false,
			onlineUserIds: [],
			connectionStatus: 'connecting',
		});
	});

	it('should handle setWSMaintenance', () => {
		const result = reducer(undefined, setWSMaintenance(true));
		expect(result).toEqual({
			maintenance: true,
			onlineUserIds: [],
			connectionStatus: 'connecting',
		});
	});

	it('should handle setWSOnlineUsers', () => {
		const result = reducer(undefined, setWSOnlineUsers([3, 1, 3]));
		expect(result).toEqual({
			maintenance: false,
			onlineUserIds: [1, 3],
			connectionStatus: 'connecting',
		});
	});

	it('clears stale online users while reconnecting', () => {
		const online = reducer(undefined, setWSOnlineUsers([1, 2]));
		expect(reducer(online, setWSConnectionStatus('reconnecting'))).toEqual({
			maintenance: false,
			onlineUserIds: [],
			connectionStatus: 'reconnecting',
		});
	});
});
