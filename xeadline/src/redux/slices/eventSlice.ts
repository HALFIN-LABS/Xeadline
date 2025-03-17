import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Event } from 'nostr-tools';
import { signEvent, UnsignedEvent } from '../../services/nostr/eventSigningService';
import nostrService from '../../services/nostr/nostrService';
import { RootState } from '../store';

interface EventState {
  pendingEvents: Record<string, Event>;
  publishedEvents: Record<string, string[]>; // Event ID -> Array of relay URLs
  loading: boolean;
  error: string | null;
  needsPassword: boolean;
}

const initialState: EventState = {
  pendingEvents: {},
  publishedEvents: {},
  loading: false,
  error: null,
  needsPassword: false
};

// Async thunk for signing and publishing an event
export const signAndPublishEvent = createAsyncThunk(
  'event/signAndPublish',
  async (
    { 
      unsignedEvent, 
      password,
      timeout = 15000,
      skipPublish = false
    }: { 
      unsignedEvent: UnsignedEvent; 
      password?: string;
      timeout?: number;
      skipPublish?: boolean;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      // Get the current user's private key
      const state = getState() as RootState;
      const currentUser = state.auth.currentUser;
      
      // Sign the event
      const signingResult = await signEvent(unsignedEvent, {
        privateKey: currentUser?.privateKey,
        password,
        timeout
      });
      
      if (!signingResult.success) {
        if (signingResult.needsPassword) {
          return rejectWithValue({
            error: 'Password required',
            needsPassword: true
          });
        }
        return rejectWithValue({
          error: signingResult.error || 'Failed to sign event'
        });
      }
      
      const signedEvent = signingResult.event!;
      
      // Skip publishing if requested
      if (skipPublish) {
        return {
          event: signedEvent,
          publishedTo: [] as string[]
        };
      }
      
      // Publish the event
      const publishedTo = await nostrService.publishEvent(signedEvent);
      
      if (publishedTo.length === 0) {
        return rejectWithValue({
          error: 'Failed to publish to any relays',
          event: signedEvent
        });
      }
      
      return {
        event: signedEvent,
        publishedTo
      };
    } catch (error) {
      return rejectWithValue({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.needsPassword = false;
    },
    addPendingEvent: (state, action: PayloadAction<Event>) => {
      state.pendingEvents[action.payload.id] = action.payload;
    },
    removePendingEvent: (state, action: PayloadAction<string>) => {
      delete state.pendingEvents[action.payload];
    },
    clearPendingEvents: (state) => {
      state.pendingEvents = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signAndPublishEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.needsPassword = false;
      })
      .addCase(signAndPublishEvent.fulfilled, (state, action) => {
        state.loading = false;
        const { event, publishedTo } = action.payload;
        state.pendingEvents[event.id] = event;
        state.publishedEvents[event.id] = publishedTo;
      })
      .addCase(signAndPublishEvent.rejected, (state, action) => {
        state.loading = false;
        
        if (action.payload) {
          const payload = action.payload as any;
          state.error = payload.error || 'Failed to sign and publish event';
          state.needsPassword = !!payload.needsPassword;
          
          // If we have a signed event but failed to publish, still store it
          if (payload.event) {
            state.pendingEvents[payload.event.id] = payload.event;
          }
        } else {
          state.error = 'Failed to sign and publish event';
        }
      });
  }
});

export const { clearError, addPendingEvent, removePendingEvent, clearPendingEvents } = eventSlice.actions;

// Selectors
export const selectEventState = (state: RootState) => state.event;
export const selectPendingEvents = (state: RootState) => state.event.pendingEvents;
export const selectPublishedEvents = (state: RootState) => state.event.publishedEvents;
export const selectEventLoading = (state: RootState) => state.event.loading;
export const selectEventError = (state: RootState) => state.event.error;
export const selectNeedsPassword = (state: RootState) => state.event.needsPassword;

export default eventSlice.reducer;