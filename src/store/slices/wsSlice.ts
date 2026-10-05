import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface WSState {
	maintenance: boolean;
	onlineUserIds: number[];
	connectionStatus: 'connecting' | 'connected' | 'reconnecting';
}

const initialState: WSState = {
	maintenance: false,
	onlineUserIds: [],
	connectionStatus: 'connecting',
};

const wsSlice = createSlice({
	name: 'ws',
	initialState,
	reducers: {
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

export const { setWSMaintenance, setWSOnlineUsers, setWSConnectionStatus } = wsSlice.actions;

export default wsSlice.reducer;
