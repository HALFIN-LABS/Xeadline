import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import nostrService, { ConnectionStatus, NostrServiceState } from '../../services/nostr/nostrService';

// Define the initial state
interface NostrState {
  status: ConnectionStatus;
  error: string | null;
  connectedRelays: string[];
  isInitialized: boolean;
}

const initialState: NostrState = {
  status: 'disconnected',
  error: null,
  connectedRelays: [],
  isInitialized: false,
};

// Async thunks
export const connectToRelays = createAsyncThunk(
  'nostr/connect',
  async (_, { rejectWithValue }) => {
    try {
      await nostrService.connect();
      return nostrService.getState();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to connect to relays'
      );
    }
  }
);

export const disconnectFromRelays = createAsyncThunk(
  'nostr/disconnect',
  async () => {
    nostrService.disconnect();
    return nostrService.getState();
  }
);

// Create the slice
const nostrSlice = createSlice({
  name: 'nostr',
  initialState,
  reducers: {
    updateConnectionStatus: (state, action: PayloadAction<NostrServiceState>) => {
      state.status = action.payload.status;
      state.error = action.payload.error || null;
      state.connectedRelays = action.payload.connectedRelays;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectToRelays.pending, (state) => {
        state.status = 'connecting';
        state.error = null;
      })
      .addCase(connectToRelays.fulfilled, (state, action) => {
        state.status = action.payload.status;
        state.error = action.payload.error || null;
        state.connectedRelays = action.payload.connectedRelays;
      })
      .addCase(connectToRelays.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string || 'Unknown error';
        state.connectedRelays = [];
      })
      .addCase(disconnectFromRelays.fulfilled, (state, action) => {
        state.status = action.payload.status;
        state.connectedRelays = [];
      });
  },
});

export const { updateConnectionStatus, setInitialized } = nostrSlice.actions;
export default nostrSlice.reducer;