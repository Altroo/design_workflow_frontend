import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface WSState {
	maintenance: boolean;
	onlineUserIds: number[];
}

const initialState: WSState = {
	maintenance: false,
	onlineUserIds: [],
};

const wsSlice = createSlice({
	name: 'ws',
	initialState,
	reducers: {
		setWSMaintenance: (state, action: PayloadAction<boolean>) => {
			state.maintenance = action.payload;
		},
		setWSOnlineUsers: (state, action: PayloadAction<number[]>) => {
			state.onlineUserIds = Array.from(new Set(action.payload)).sort((left, right) => left - right);
		},
	},
});

export const { setWSMaintenance, setWSOnlineUsers } = wsSlice.actions;

export default wsSlice.reducer;
