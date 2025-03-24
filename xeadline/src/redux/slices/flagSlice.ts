import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { signEvent, UnsignedEvent } from '../../services/nostr/eventSigningService';
import nostrService from '../../services/nostr/nostrService';
import { Event, Filter } from 'nostr-tools';

// Define the flag event kind
const FLAG_EVENT_KIND = 34552; // Custom kind for content flagging

// Define types
export interface FlaggedContent {
  id: string; // Unique identifier for the flagged content
  contentId: string; // ID of the flagged content (post or comment)
  contentType: 'post' | 'comment'; // Type of content
  topicId: string; // ID of the topic where the content was posted
  reason: string; // Reason for flagging
  details?: string; // Additional details
  status: 'pending' | 'approved' | 'rejected'; // Moderation status
  flaggerPubkey: string; // Public key of the user who flagged the content
  createdAt: number; // Timestamp when the content was flagged
  resolvedAt?: number; // Timestamp when the flag was resolved
  resolvedBy?: string; // Public key of the moderator who resolved the flag
}

export interface FlagState {
  byId: Record<string, FlaggedContent>;
  allIds: string[];
  pendingIds: string[];
  resolvedIds: string[];
  loading: boolean;
  error: string | null;
}

const initialState: FlagState = {
  byId: {},
  allIds: [],
  pendingIds: [],
  resolvedIds: [],
  loading: false,
  error: null
};

// Flag content thunk
export const flagContent = createAsyncThunk(
  'flag/flagContent',
  async (
    {
      contentId,
      contentType,
      topicId,
      reason,
      details,
      privateKey
    }: {
      contentId: string;
      contentType: 'post' | 'comment';
      topicId: string;
      reason: string;
      details?: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log(`Flagging ${contentType} with ID: ${contentId} in topic: ${topicId}`);
      
      // Create the flag content
      const flagContent = {
        contentId,
        contentType,
        topicId,
        reason,
        details,
        status: 'pending'
      };
      
      // Create an unsigned flag event
      const unsignedEvent: UnsignedEvent = {
        kind: FLAG_EVENT_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', contentId], // Content ID
          ['t', topicId], // Topic ID
          ['r', reason], // Reason
          ['c', contentType], // Content type
          ['client', 'xeadline']
        ],
        content: details || '',
        pubkey: '' // Will be filled in by signing service
      };
      
      // Use the improved event signing service
      const signingResult = await signEvent(unsignedEvent, {
        privateKey,
        timeout: 15000,
        retryCount: 0
      });
      
      if (!signingResult.success || !signingResult.event) {
        console.error('Failed to sign flag event:', signingResult.error);
        return rejectWithValue(signingResult.error || 'Failed to sign flag event');
      }
      
      const signedEvent = signingResult.event;
      
      // Publish the event to Nostr relays
      console.log('Publishing flag event to Nostr relays:', {
        id: signedEvent.id,
        pubkey: signedEvent.pubkey,
        kind: signedEvent.kind,
        created_at: signedEvent.created_at,
        tags: signedEvent.tags
      });
      
      const publishedTo = await nostrService.publishEvent(signedEvent);
      console.log(`Published flag event to ${publishedTo.length} relays:`, publishedTo);
      
      // Create the flagged content object
      const flaggedContent: FlaggedContent = {
        id: signedEvent.id,
        contentId,
        contentType,
        topicId,
        reason,
        details,
        status: 'pending',
        flaggerPubkey: signedEvent.pubkey,
        createdAt: signedEvent.created_at
      };
      
      return flaggedContent;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to flag content');
    }
  }
);

// Fetch flagged content for a topic
export const fetchFlaggedContent = createAsyncThunk(
  'flag/fetchFlaggedContent',
  async (
    {
      topicId,
      status
    }: {
      topicId: string;
      status?: 'pending' | 'approved' | 'rejected';
    },
    { rejectWithValue }
  ) => {
    try {
      console.log(`Fetching flagged content for topic: ${topicId}, status: ${status || 'all'}`);
      
      // Create filters to get flag events for this topic
      const filters: Filter[] = [
        {
          kinds: [FLAG_EVENT_KIND],
          '#t': [topicId],
          limit: 100
        }
      ];
      
      // Fetch events from Nostr relays
      const events = await nostrService.getEvents(filters);
      console.log(`Found ${events.length} flag events for topic ${topicId}`);
      
      // Process events to create flagged content objects
      const flaggedContent: FlaggedContent[] = events.map((event: Event) => {
        // Extract data from event tags
        const contentId = event.tags.find(tag => tag[0] === 'e')?.[1] || '';
        const contentType = event.tags.find(tag => tag[0] === 'c')?.[1] as 'post' | 'comment' || 'post';
        const reason = event.tags.find(tag => tag[0] === 'r')?.[1] || 'Inappropriate content';
        const statusTag = event.tags.find(tag => tag[0] === 's');
        const resolvedByTag = event.tags.find(tag => tag[0] === 'p');
        const resolvedAtTag = event.tags.find(tag => tag[0] === 'resolved_at');
        
        // Determine status
        let flagStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        if (statusTag) {
          flagStatus = statusTag[1] as 'pending' | 'approved' | 'rejected';
        }
        
        // Create flagged content object
        return {
          id: event.id,
          contentId,
          contentType,
          topicId,
          reason,
          details: event.content,
          status: flagStatus,
          flaggerPubkey: event.pubkey,
          createdAt: event.created_at,
          resolvedAt: resolvedAtTag ? parseInt(resolvedAtTag[1]) : undefined,
          resolvedBy: resolvedByTag ? resolvedByTag[1] : undefined
        };
      });
      
      // Filter by status if provided
      const filteredContent = status
        ? flaggedContent.filter(content => content.status === status)
        : flaggedContent;
      
      return filteredContent;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch flagged content');
    }
  }
);

// Resolve flagged content
export const resolveFlaggedContent = createAsyncThunk(
  'flag/resolveFlaggedContent',
  async (
    {
      flagId,
      status,
      privateKey
    }: {
      flagId: string;
      status: 'approved' | 'rejected';
      privateKey?: string;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as RootState;
      const flaggedContent = state.flag.byId[flagId];
      
      if (!flaggedContent) {
        return rejectWithValue('Flagged content not found');
      }
      
      console.log(`Resolving flagged content: ${flagId} with status: ${status}`);
      
      // Create an unsigned resolution event
      const unsignedEvent: UnsignedEvent = {
        kind: FLAG_EVENT_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', flaggedContent.contentId], // Content ID
          ['t', flaggedContent.topicId], // Topic ID
          ['r', flaggedContent.reason], // Reason
          ['c', flaggedContent.contentType], // Content type
          ['s', status], // Resolution status
          ['resolved_at', Math.floor(Date.now() / 1000).toString()], // Resolution timestamp
          ['client', 'xeadline']
        ],
        content: flaggedContent.details || '',
        pubkey: '' // Will be filled in by signing service
      };
      
      // Use the improved event signing service
      const signingResult = await signEvent(unsignedEvent, {
        privateKey,
        timeout: 15000,
        retryCount: 0
      });
      
      if (!signingResult.success || !signingResult.event) {
        console.error('Failed to sign resolution event:', signingResult.error);
        return rejectWithValue(signingResult.error || 'Failed to sign resolution event');
      }
      
      const signedEvent = signingResult.event;
      
      // Publish the event to Nostr relays
      console.log('Publishing resolution event to Nostr relays:', {
        id: signedEvent.id,
        pubkey: signedEvent.pubkey,
        kind: signedEvent.kind,
        created_at: signedEvent.created_at,
        tags: signedEvent.tags
      });
      
      const publishedTo = await nostrService.publishEvent(signedEvent);
      console.log(`Published resolution event to ${publishedTo.length} relays:`, publishedTo);
      
      // Create the updated flagged content object
      const updatedFlaggedContent: FlaggedContent = {
        ...flaggedContent,
        status,
        resolvedAt: Math.floor(Date.now() / 1000),
        resolvedBy: signedEvent.pubkey
      };
      
      return updatedFlaggedContent;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to resolve flagged content');
    }
  }
);

// Create the flag slice
export const flagSlice = createSlice({
  name: 'flag',
  initialState,
  reducers: {
    clearFlagError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Flag content
      .addCase(flagContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(flagContent.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        state.allIds.push(action.payload.id);
        state.pendingIds.push(action.payload.id);
      })
      .addCase(flagContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch flagged content
      .addCase(fetchFlaggedContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFlaggedContent.fulfilled, (state, action) => {
        state.loading = false;
        
        // Reset state for this topic
        state.allIds = [];
        state.pendingIds = [];
        state.resolvedIds = [];
        state.byId = {};
        
        // Add flagged content to state
        action.payload.forEach(content => {
          state.byId[content.id] = content;
          state.allIds.push(content.id);
          
          if (content.status === 'pending') {
            state.pendingIds.push(content.id);
          } else {
            state.resolvedIds.push(content.id);
          }
        });
      })
      .addCase(fetchFlaggedContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Resolve flagged content
      .addCase(resolveFlaggedContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resolveFlaggedContent.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update the flagged content in state
        state.byId[action.payload.id] = action.payload;
        
        // Move from pending to resolved
        state.pendingIds = state.pendingIds.filter(id => id !== action.payload.id);
        if (!state.resolvedIds.includes(action.payload.id)) {
          state.resolvedIds.push(action.payload.id);
        }
      })
      .addCase(resolveFlaggedContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearFlagError } = flagSlice.actions;

// Export selectors
export const selectFlaggedContent = (state: RootState) => state.flag.byId;
export const selectAllFlagIds = (state: RootState) => state.flag.allIds;
export const selectPendingFlagIds = (state: RootState) => state.flag.pendingIds;
export const selectResolvedFlagIds = (state: RootState) => state.flag.resolvedIds;
export const selectFlagLoading = (state: RootState) => state.flag.loading;
export const selectFlagError = (state: RootState) => state.flag.error;

export default flagSlice.reducer;