import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WSState } from '@/types/wsTypes';
import { APP_VERSION, isAppVersion } from '@/utils/appVersion';

const initialState: WSState = {
	maintenance: false,
	localVersion: APP_VERSION,
	serverVersion: null,
	onlineUserIds: [],
	connectionStatus: 'connecting',
};

const wsSlice = createSlice({
	name: 'ws',
	initialState,
	reducers: {
		setWSServerVersion: (state, action: PayloadAction<unknown>) => {
			if (isAppVersion(action.payload)) state.serverVersion = action.payload;
		},
		setWSConnectionStatus: (state, action: PayloadAction<WSState['connectionStatus']>) => {
			state.connectionStatus = action.payload;
			if (action.payload !== 'connected') state.onlineUserIds = [];
		},
		setWSMaintenance: (state, action: PayloadAction<boolean>) => {
			state.maintenance = action.payload;
		},
		setWSOnlineUsers: (state, action: PayloadAction<number[]>) => {
			state.onlineUserIds = Array.from(new Set(action.payload)).sort((left, right) => left - right);
		},
	},
});

export const { setWSMaintenance, setWSOnlineUsers, setWSConnectionStatus, setWSServerVersion } = wsSlice.actions;

export default wsSlice.reducer;
