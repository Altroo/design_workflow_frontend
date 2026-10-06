import type { EventChannel } from 'redux-saga';
import { buffers, eventChannel } from 'redux-saga';
import {
	WSDesignWorkflowInvalidateAction,
	WSMaintenanceAction,
	WSUserAvatarAction,
	WSReconnectedAction,
	WSUserPresenceAction,
} from '@/store/actions/wsActions';
import type { WSAction } from '@/types/wsTypes';
import { setWSConnectionStatus } from '@/store/slices/wsSlice';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const WS_MAX_RECONNECT_DELAY_MS = 30_000;
const WS_INITIAL_RECONNECT_DELAY_MS = 1_000;
const WS_CONNECT_TIMEOUT_MS = 20_000;
const WS_HEARTBEAT_INTERVAL_MS = 25_000;
const WS_HEARTBEAT_TIMEOUT_MS = 10_000;
const CHAT_MUTATIONS = new Set(['message', 'read', 'deleted', 'updated', 'reaction', 'decision', 'reminder', 'thread']);

// The transport is owned by its channel. This reference is only for chat sends.
let activeSendSocket: WebSocket | null = null;
const socketListeners = new Set<(payload: unknown) => void>();

export function subscribeWorkflowSocket(listener: (payload: unknown) => void): () => void {
	socketListeners.add(listener);
	return () => {
		socketListeners.delete(listener);
	};
}

function notifySocketListeners(payload: unknown): void {
	for (const listener of socketListeners) {
		try {
			listener(payload);
		} catch {
			// One unmounted/failed consumer must not stop the shared transport.
		}
	}
}

export function sendWorkflowSocket(payload: unknown): boolean {
	if (!activeSendSocket || activeSendSocket.readyState !== 1) return false;
	try {
		activeSendSocket.send(JSON.stringify(payload));
		return true;
	} catch {
		return false;
	}
}

export function initWebsocket(getToken: () => Promise<string | null>): EventChannel<WSAction> {
	return eventChannel<WSAction>((emitter) => {
		let socket: WebSocket | null = null;
		let disposed = false;
		let reconnectDelay = WS_INITIAL_RECONNECT_DELAY_MS;
		let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
		let connectionTimer: ReturnType<typeof setTimeout> | undefined;
		let heartbeatTimer: ReturnType<typeof setTimeout> | undefined;
		let heartbeatDeadline: ReturnType<typeof setTimeout> | undefined;
		let latestPresenceRevision = 0;

		function clearConnectionTimers() {
			clearTimeout(connectionTimer);
			clearTimeout(heartbeatTimer);
			clearTimeout(heartbeatDeadline);
			connectionTimer = heartbeatTimer = heartbeatDeadline = undefined;
		}

		function closeOwnedSocket() {
			clearConnectionTimers();
			const ownedSocket = socket;
			socket = null;
			if (!ownedSocket) return;
			if (activeSendSocket === ownedSocket) activeSendSocket = null;
			ownedSocket.onopen = ownedSocket.onmessage = ownedSocket.onerror = ownedSocket.onclose = null;
			try {
				ownedSocket.close();
			} catch {
				/* Already closed. */
			}
		}

		function scheduleReconnect() {
			if (disposed || reconnectTimer !== undefined) return;
			emitter(setWSConnectionStatus('reconnecting'));
			reconnectTimer = setTimeout(() => {
				reconnectTimer = undefined;
				void createWs();
			}, reconnectDelay);
			reconnectDelay = Math.min(reconnectDelay * 2, WS_MAX_RECONNECT_DELAY_MS);
		}

		function retireSocket(candidate: WebSocket) {
			if (disposed || socket !== candidate) return;
			closeOwnedSocket();
			scheduleReconnect();
		}

		function scheduleHeartbeat(candidate: WebSocket) {
			clearTimeout(heartbeatTimer);
			heartbeatTimer = setTimeout(() => {
				heartbeatTimer = undefined;
				if (disposed || socket !== candidate) return;
				if (candidate.readyState !== 1) {
					retireSocket(candidate);
					return;
				}
				try {
					candidate.send(JSON.stringify({ type: 'ping' }));
					heartbeatDeadline = setTimeout(() => retireSocket(candidate), WS_HEARTBEAT_TIMEOUT_MS);
				} catch {
					retireSocket(candidate);
				}
			}, WS_HEARTBEAT_INTERVAL_MS);
		}

		async function createWs() {
			if (disposed || typeof window === 'undefined') return;
			const wsUrl = process.env.NEXT_PUBLIC_ROOT_WS_URL;
			if (!wsUrl) return;
			try {
				const token = await getToken();
				if (disposed) return;
				if (!token) {
					scheduleReconnect();
					return;
				}
				const candidate = new WebSocket(`${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`);
				socket = candidate;
				connectionTimer = setTimeout(() => retireSocket(candidate), WS_CONNECT_TIMEOUT_MS);
				candidate.onopen = () => {
					if (disposed || socket !== candidate) return;
					clearTimeout(connectionTimer);
					connectionTimer = undefined;
					reconnectDelay = WS_INITIAL_RECONNECT_DELAY_MS;
					activeSendSocket = candidate;
					latestPresenceRevision = 0;
					emitter(setWSConnectionStatus('connected'));
					scheduleHeartbeat(candidate);
					// Initial connection also closes the REST bootstrap/subscription gap.
					emitter(WSReconnectedAction());
					notifySocketListeners({ type: 'reconnected' });
				};
				candidate.onerror = () => retireSocket(candidate);
				candidate.onclose = () => retireSocket(candidate);
				candidate.onmessage = (event: MessageEvent) => {
					if (disposed || socket !== candidate) return;
					try {
						const payload: unknown = JSON.parse(event.data as string);
						if (!isObjectRecord(payload)) return;
						const message =
							isObjectRecord(payload.message) && typeof payload.message.type === 'string' ? payload.message : payload;
						const signalType = message.type;
						if (typeof signalType !== 'string') return;
						if (signalType === 'pong') {
							clearTimeout(heartbeatDeadline);
							heartbeatDeadline = undefined;
							scheduleHeartbeat(candidate);
							return;
						}
						if (signalType === 'USER_AVATAR') {
							if (typeof message.pk === 'number' && typeof message.avatar === 'string') {
								emitter(WSUserAvatarAction(message.pk, message.avatar));
							}
						} else if (signalType === 'MAINTENANCE') {
							if (typeof message.maintenance === 'boolean') emitter(WSMaintenanceAction(message.maintenance));
						} else if (
							signalType === 'TASK_EVENT' ||
							signalType === 'NOTIFICATION' ||
							signalType === 'WORKFLOW_EVENT'
						) {
							emitter(
								WSDesignWorkflowInvalidateAction(
									signalType,
									typeof message.scope === 'string' ? message.scope : undefined,
								),
							);
						} else if (/^chat[._]/.test(signalType) && CHAT_MUTATIONS.has(signalType.slice(5))) {
							emitter(WSDesignWorkflowInvalidateAction('CHAT_EVENT'));
						} else if (signalType === 'USER_PRESENCE') {
							if (
								typeof message.user_id === 'number' &&
								typeof message.online === 'boolean' &&
								Array.isArray(message.online_user_ids)
							) {
								if (typeof message.revision === 'number' && Number.isFinite(message.revision)) {
									if (message.revision < latestPresenceRevision) return;
									latestPresenceRevision = message.revision;
								}
								emitter(
									WSUserPresenceAction(
										message.user_id,
										message.online,
										message.online_user_ids.filter((id): id is number => typeof id === 'number'),
									),
								);
							}
						}
						notifySocketListeners(payload);
					} catch {
						// Ignore malformed frames; keep listening for subsequent updates.
					}
				};
			} catch {
				// Session refresh and WebSocket construction can fail temporarily.
				scheduleReconnect();
			}
		}

		void createWs();
		return () => {
			disposed = true;
			clearTimeout(reconnectTimer);
			reconnectTimer = undefined;
			closeOwnedSocket();
		};
	}, buffers.expanding<WSAction>());
}
