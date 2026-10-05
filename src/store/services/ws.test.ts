import type { EventChannel } from 'redux-saga';
import type { WSAction } from '@/types/wsTypes';
import { setWSConnectionStatus } from '@/store/slices/wsSlice';
import { initWebsocket, sendWorkflowSocket, subscribeWorkflowSocket } from './ws';
import { WSDesignWorkflowInvalidateAction, WSMaintenanceAction, WSReconnectedAction, WSUserAvatarAction, WSUserPresenceAction } from '@/store/actions/wsActions';

// Existing protocol assertions ignore the separate connection-state stream.
const takeProtocolAction = (channel: EventChannel<WSAction>, callback: (action: WSAction) => void) => {
  channel.take(action => {
    if (action.type === setWSConnectionStatus.type) takeProtocolAction(channel, callback);
    else callback(action as WSAction);
  });
};

class MockWebSocket implements WebSocket {
  url: string;
  onopen: ((this: WebSocket, ev: Event) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;
  readonly CLOSED = 3;
  readonly CLOSING = 2;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readyState: 0 | 1 | 2 | 3 = this.CONNECTING;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';

  constructor(url: string) {
    this.url = url;
  }

  send = jest.fn<void, [string]>();
  close(): void {
    this.readyState = this.CLOSED;
    this.onclose?.call(this, new CloseEvent('close'));
  }
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

describe('initWebsocket', () => {
  let originalWebSocket: typeof WebSocket | undefined;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    delete (global as unknown as { WebSocket?: typeof WebSocket }).WebSocket;
  });

  afterEach(() => {
    if (originalWebSocket) {
      global.WebSocket = originalWebSocket;
    } else {
      delete (global as unknown as { WebSocket?: typeof WebSocket }).WebSocket;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('emits WSUserAvatarAction when USER_AVATAR message is received', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    type ExpectedAction = ReturnType<typeof WSUserAvatarAction>;
    const channel = initWebsocket(async () => 'test-token');

    const emitted = await new Promise<ExpectedAction>((resolve) => {
      channel.take((action) => {
        resolve(action as ExpectedAction);
      });

      const sendMessage = () => {
        if (createdSocket == null) {
          setTimeout(sendMessage, 0);
          return;
        }
        const ev = new MessageEvent('message', {
          data: JSON.stringify({
            message: { type: 'USER_AVATAR', pk: 42, avatar: 'https://example.com/avatar.png' },
          }),
        });
        createdSocket.onmessage?.(ev);
      };

      sendMessage();
    });

    expect(emitted).toEqual(WSUserAvatarAction(42, 'https://example.com/avatar.png'));
    channel.close();
  });

  it('emits WSMaintenanceAction when MAINTENANCE message is received', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    type ExpectedAction = ReturnType<typeof WSMaintenanceAction>;
    const channel = initWebsocket(async () => 'test-token');

    const emitted = await new Promise<ExpectedAction>((resolve) => {
      channel.take((action) => {
        resolve(action as ExpectedAction);
      });

      const sendMessage = () => {
        if (createdSocket == null) {
          setTimeout(sendMessage, 0);
          return;
        }
        const ev = new MessageEvent('message', {
          data: JSON.stringify({
            message: { type: 'MAINTENANCE', maintenance: true },
          }),
        });
        createdSocket.onmessage?.(ev);
      };

      sendMessage();
    });

    expect(emitted).toEqual(WSMaintenanceAction(true));
    channel.close();
  });

  it('emits WSUserPresenceAction when USER_PRESENCE message is received', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    type ExpectedAction = ReturnType<typeof WSUserPresenceAction>;
    const channel = initWebsocket(async () => 'test-token');

    const emitted = await new Promise<ExpectedAction>((resolve) => {
      channel.take((action) => {
        resolve(action as ExpectedAction);
      });

      const sendMessage = () => {
        if (createdSocket == null) {
          setTimeout(sendMessage, 0);
          return;
        }
        const ev = new MessageEvent('message', {
          data: JSON.stringify({
            message: { type: 'USER_PRESENCE', user_id: 5, online: true, online_user_ids: [2, 5, 'bad'] },
          }),
        });
        createdSocket.onmessage?.(ev);
      };

      sendMessage();
    });

    expect(emitted).toEqual(WSUserPresenceAction(5, true, [2, 5]));
    channel.close();
  });

  it('handles onopen callback and resets reconnect delay', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await new Promise<void>((resolve) => {
      const checkSocket = () => {
        if (createdSocket) {
          createdSocket.onopen?.call(createdSocket, new Event('open'));
          resolve();
        } else {
          setTimeout(checkSocket, 0);
        }
      };
      checkSocket();
    });

    expect(createdSocket).not.toBeNull();
    channel.close();
  });

  it('handles onerror callback gracefully', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await new Promise<void>((resolve) => {
      const checkSocket = () => {
        if (createdSocket) {
          createdSocket.onerror?.call(createdSocket, new Event('error'));
          resolve();
        } else {
          setTimeout(checkSocket, 0);
        }
      };
      checkSocket();
    });

    expect(createdSocket).not.toBeNull();
    channel.close();
  });

  it('handles malformed message data gracefully', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await new Promise<void>((resolve) => {
      const sendMalformed = () => {
        if (createdSocket == null) {
          setTimeout(sendMalformed, 0);
          return;
        }
        const ev = new MessageEvent('message', { data: 'not valid json {' });
        createdSocket.onmessage?.(ev);
        resolve();
      };
      sendMalformed();
    });

    expect(createdSocket).not.toBeNull();
    channel.close();
  });

  it('handles message with null content gracefully', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await new Promise<void>((resolve) => {
      const sendNull = () => {
        if (createdSocket == null) {
          setTimeout(sendNull, 0);
          return;
        }
        const ev = new MessageEvent('message', { data: 'null' });
        createdSocket.onmessage?.(ev);
        resolve();
      };
      sendNull();
    });

    expect(createdSocket).not.toBeNull();
    channel.close();
  });

  it('handles unknown message type gracefully', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await new Promise<void>((resolve) => {
      const sendUnknown = () => {
        if (createdSocket == null) {
          setTimeout(sendUnknown, 0);
          return;
        }
        const ev = new MessageEvent('message', {
          data: JSON.stringify({ message: { type: 'UNKNOWN_TYPE', data: 'test' } }),
        });
        createdSocket.onmessage?.(ev);
        resolve();
      };
      sendUnknown();
    });

    expect(createdSocket).not.toBeNull();
    channel.close();
  });

  it('emits WSReconnectedAction on first onopen to recover bootstrap mutations', async () => {
    let createdSocket: MockWebSocket | null = null;

    global.WebSocket = jest.fn((url: string) => {
      createdSocket = new MockWebSocket(url);
      return createdSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    type ExpectedAction = ReturnType<typeof WSUserAvatarAction>;
    const channel = initWebsocket(async () => 'test-token');

    const emitted = await new Promise<ExpectedAction>((resolve) => {
      takeProtocolAction(channel, (action) => resolve(action as ExpectedAction));

      const trigger = () => {
        if (createdSocket == null) { setTimeout(trigger, 0); return; }
        createdSocket.onopen?.call(createdSocket, new Event('open'));
        const ev = new MessageEvent('message', {
          data: JSON.stringify({ message: { type: 'USER_AVATAR', pk: 7, avatar: 'test.png' } }),
        });
        createdSocket.onmessage?.(ev);
      };
      trigger();
    });

    expect(emitted).toEqual(WSReconnectedAction());
    channel.close();
  });

  it('emits WSReconnectedAction on second onopen (reconnect)', async () => {
    jest.useFakeTimers();
    const sockets: MockWebSocket[] = [];

    global.WebSocket = jest.fn((url: string) => {
      const socket = new MockWebSocket(url);
      sockets.push(socket);
      return socket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await jest.advanceTimersByTimeAsync(0);
    expect(sockets).toHaveLength(1);

    sockets[0].onopen?.call(sockets[0], new Event('open'));
    sockets[0].onclose?.call(sockets[0], new CloseEvent('close'));

    await jest.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(2);

    type ReconnectedAction = ReturnType<typeof WSReconnectedAction>;
    const emitted = new Promise<ReconnectedAction>((resolve) => {
      takeProtocolAction(channel, (action) => resolve(action as ReconnectedAction));
      sockets[1].onopen?.call(sockets[1], new Event('open'));
    });

    const result = await emitted;
    expect(result).toEqual(WSReconnectedAction());
    channel.close();
  });

  it('reconnects with exponential backoff on close', async () => {
    jest.useFakeTimers();
    let createCount = 0;
    const sockets: MockWebSocket[] = [];

    global.WebSocket = jest.fn((url: string) => {
      const socket = new MockWebSocket(url);
      sockets.push(socket);
      createCount++;
      return socket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost';

    const channel = initWebsocket(async () => 'test-token');

    await jest.advanceTimersByTimeAsync(0);
    expect(createCount).toBe(1);

    sockets[0].onclose?.call(sockets[0], new CloseEvent('close'));
    await jest.advanceTimersByTimeAsync(1000);
    expect(createCount).toBe(2);

    sockets[1].onclose?.call(sockets[1], new CloseEvent('close'));
    await jest.advanceTimersByTimeAsync(2000);
    expect(createCount).toBe(3);

    channel.close();
  });
});

describe('shared WebSocket recovery and subscriptions', () => {
  let originalWebSocket: typeof WebSocket;
  let sockets: MockWebSocket[];
  let channels: EventChannel<WSAction>[];
  let unsubscribers: Array<() => void>;

  beforeEach(() => {
    jest.useFakeTimers();
    originalWebSocket = global.WebSocket;
    sockets = [];
    channels = [];
    unsubscribers = [];
    process.env.NEXT_PUBLIC_ROOT_WS_URL = 'ws://localhost/ws';
    global.WebSocket = jest.fn((url: string) => {
      const socket = new MockWebSocket(url);
      sockets.push(socket);
      return socket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;
  });

  afterEach(() => {
    channels.forEach((channel) => channel.close());
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    global.WebSocket = originalWebSocket;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const connect = async (getToken = async (): Promise<string | null> => 'test-token') => {
    const channel = initWebsocket(getToken);
    channels.push(channel);
    await jest.advanceTimersByTimeAsync(0);
    return channel;
  };
  const open = (socket: MockWebSocket) => {
    socket.readyState = socket.OPEN;
    socket.onopen?.call(socket, new Event('open'));
  };
  const message = (socket: MockWebSocket, payload: unknown) => {
    socket.onmessage?.call(socket, new MessageEvent('message', { data: JSON.stringify(payload) }));
  };
  const takeAction = (channel: EventChannel<WSAction>) => new Promise((resolve) => takeProtocolAction(channel, resolve));

  it.each(['TASK_EVENT', 'NOTIFICATION', 'WORKFLOW_EVENT'] as const)('forwards %s invalidation with scope', async (type) => {
    const channel = await connect();
    message(sockets[0], { message: { type, scope: 'projects' } });
    expect(await takeAction(channel)).toEqual(WSDesignWorkflowInvalidateAction(type, 'projects'));
  });

  it.each(['chat.message', 'chat_message', 'chat.read', 'chat_read', 'chat.deleted', 'chat_deleted', 'chat.updated', 'chat_updated', 'chat.reaction', 'chat_reaction', 'chat.reminder', 'chat_reminder', 'chat.thread'])('forwards raw %s invalidation', async (type) => {
    const channel = await connect();
    message(sockets[0], { type, thread_id: 4, message: { id: 9, thread: 4 } });
    expect(await takeAction(channel)).toEqual(WSDesignWorkflowInvalidateAction('CHAT_EVENT'));
  });

  it('delivers original chat/presence payloads and reconnects to subscribers, without fetching for typing', async () => {
    const channel = await connect();
    const listener = jest.fn();
    const unsubscribe = subscribeWorkflowSocket(listener);
    unsubscribers.push(unsubscribe);
    open(sockets[0]);
    expect(await takeAction(channel)).toEqual(WSReconnectedAction());
    expect(listener).toHaveBeenCalledWith({ type: 'reconnected' });
    const action = jest.fn();
    takeProtocolAction(channel, action);
    const payload = { type: 'chat.typing', thread_id: 4, user: { id: 3 }, is_typing: true };
    message(sockets[0], payload);
    expect(listener).toHaveBeenLastCalledWith(payload);
    expect(action).not.toHaveBeenCalled();
    unsubscribe();
    message(sockets[0], payload);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('isolates subscriber errors and sends only through the currently open socket', async () => {
    expect(sendWorkflowSocket({ type: 'chat_typing' })).toBe(false);
    await connect();
    expect(sendWorkflowSocket({ type: 'chat_typing' })).toBe(false);
    unsubscribers.push(subscribeWorkflowSocket(() => { throw new Error('consumer failed'); }));
    const listener = jest.fn();
    unsubscribers.push(subscribeWorkflowSocket(listener));
    open(sockets[0]);
    expect(listener).toHaveBeenCalledWith({ type: 'reconnected' });
    expect(sendWorkflowSocket({ type: 'chat_typing', thread_id: 2 })).toBe(true);
    expect(sockets[0].send).toHaveBeenLastCalledWith(JSON.stringify({ type: 'chat_typing', thread_id: 2 }));
    sockets[0].send.mockImplementationOnce(() => { throw new Error('offline'); });
    expect(sendWorkflowSocket({ type: 'chat_typing' })).toBe(false);
    channels[0].close();
    expect(sendWorkflowSocket({ type: 'chat_typing' })).toBe(false);
  });

  it('does not close another channel socket when an older channel is disposed', async () => {
    const first = await connect();
    open(sockets[0]);
    await connect();
    open(sockets[1]);
    first.close();
    expect(sockets[0].readyState).toBe(sockets[0].CLOSED);
    expect(sockets[1].readyState).toBe(sockets[1].OPEN);
    expect(sendWorkflowSocket({ type: 'chat_typing' })).toBe(true);
    expect(sockets[1].send).toHaveBeenCalledTimes(1);
  });

  it('cancels queued reconnect and ignores callbacks retained after cleanup', async () => {
    const channel = await connect();
    const lateClose = sockets[0].onclose;
    sockets[0].close();
    channel.close();
    lateClose?.call(sockets[0], new CloseEvent('close'));
    await jest.advanceTimersByTimeAsync(120_000);
    expect(sockets).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores a pending session result after cleanup', async () => {
    let resolveToken!: (token: string) => void;
    const channel = await connect(() => new Promise((resolve) => { resolveToken = resolve; }));
    channel.close();
    resolveToken('late-token');
    await jest.advanceTimersByTimeAsync(120_000);
    expect(sockets).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retries missing/rejected tokens with backoff, then uses the newest token', async () => {
    const getToken = jest.fn<Promise<string | null>, []>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('session unavailable'))
      .mockResolvedValueOnce('fresh token');
    await connect(getToken);
    expect(sockets).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(getToken).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1_999);
    expect(sockets).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    expect(sockets[0].url).toBe('ws://localhost/ws?token=fresh%20token');
  });

  it('retries construction failures and bounds a connection that never opens', async () => {
    (global.WebSocket as unknown as jest.Mock).mockImplementationOnce(() => { throw new Error('setup failed'); });
    await connect();
    expect(sockets).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(sockets).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(sockets[0].readyState).toBe(sockets[0].CLOSED);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(sockets).toHaveLength(2);
  });

  it('keeps a responsive connection alive with ping/pong and cancels all heartbeat timers on cleanup', async () => {
    const channel = await connect();
    open(sockets[0]);
    await jest.advanceTimersByTimeAsync(25_000);
    expect(sockets[0].send).toHaveBeenLastCalledWith(JSON.stringify({ type: 'ping' }));
    message(sockets[0], { type: 'pong' });
    await jest.advanceTimersByTimeAsync(25_000);
    expect(sockets[0].send).toHaveBeenCalledTimes(2);
    message(sockets[0], { type: 'pong' });
    expect(sockets).toHaveLength(1);
    channel.close();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(sockets).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reconnects half-open sockets without a pong and discards stale socket events', async () => {
    const channel = await connect();
    open(sockets[0]);
    expect(await takeAction(channel)).toEqual(WSReconnectedAction());
    const lateMessage = sockets[0].onmessage;
    await jest.advanceTimersByTimeAsync(35_000);
    expect(sockets[0].readyState).toBe(sockets[0].CLOSED);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(sockets).toHaveLength(2);
    const action = jest.fn();
    takeProtocolAction(channel, action);
    lateMessage?.call(sockets[0], new MessageEvent('message', { data: JSON.stringify({ message: { type: 'TASK_EVENT' } }) }));
    expect(action).not.toHaveBeenCalled();
    open(sockets[1]);
    expect(action).toHaveBeenCalledWith(WSReconnectedAction());
  });

  it('publishes connection state and ignores older presence snapshots until reconnect', async () => {
    const channel = await connect();
    const takeRaw = () => new Promise(resolve => channel.take(resolve));
    open(sockets[0]);
    expect(await takeRaw()).toEqual(setWSConnectionStatus('connected'));
    expect(await takeRaw()).toEqual(WSReconnectedAction());
    const listener = jest.fn();
    unsubscribers.push(subscribeWorkflowSocket(listener));
    const presence = (revision: number, ids: number[]) => ({ message: {
      type: 'USER_PRESENCE', user_id: 1, online: true, online_user_ids: ids, revision,
    } });
    message(sockets[0], presence(200, [1, 2]));
    expect(await takeRaw()).toEqual(WSUserPresenceAction(1, true, [1, 2]));
    listener.mockClear();
    message(sockets[0], presence(100, [1]));
    expect(listener).not.toHaveBeenCalled();
    sockets[0].close();
    expect(await takeRaw()).toEqual(setWSConnectionStatus('reconnecting'));
    await jest.advanceTimersByTimeAsync(1000);
    open(sockets[1]);
    expect(await takeRaw()).toEqual(setWSConnectionStatus('connected'));
    expect(await takeRaw()).toEqual(WSReconnectedAction());
    message(sockets[1], presence(1, [1]));
    expect(await takeRaw()).toEqual(WSUserPresenceAction(1, true, [1]));
  });
});
