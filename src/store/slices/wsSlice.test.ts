import reducer, {setWSMaintenance, setWSOnlineUsers} from './wsSlice';

describe('wsSlice reducer', () => {
  it('should return the initial state when passed an empty action', () => {
    const result = reducer(undefined, {type: ''});
    expect(result).toEqual({
      maintenance: false,
      onlineUserIds: [],
    });
  });

  it('should handle setWSMaintenance', () => {
    const result = reducer(undefined, setWSMaintenance(true));
    expect(result).toEqual({
      maintenance: true,
      onlineUserIds: [],
    });
  });

  it('should handle setWSOnlineUsers', () => {
    const result = reducer(undefined, setWSOnlineUsers([3, 1, 3]));
    expect(result).toEqual({
      maintenance: false,
      onlineUserIds: [1, 3],
    });
  });
});
