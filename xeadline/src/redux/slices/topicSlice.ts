import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Event, getEventHash } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';

// Define types
export interface Topic {
  id: string; // Format: <pubkey>:<d-identifier>
  name: string;
  slug: string; // Human-readable identifier for URLs
  description: string;
  rules: string[];
  image?: string;
  banner?: string;
  moderators: string[]; // Array of pubkeys
  createdAt: number;
  pubkey: string; // Creator's pubkey
  moderationSettings: {
    moderationType: 'pre-approval' | 'post-publication' | 'hybrid';
    autoApproveAfter?: number; // Number of successful posts before auto-approval
    requireLightningDeposit?: boolean;
    depositAmount?: number;
  };
  memberCount?: number;
}

export interface TopicState {
  byId: Record<string, Topic>;
  allIds: string[];
  subscribed: string[];
  trending: string[];
  new: string[];
  loading: boolean;
  error: string | null;
  currentTopicId: string | null;
}

const initialState: TopicState = {
  byId: {},
  allIds: [],
  subscribed: [],
  trending: [],
  new: [],
  loading: false,
  error: null,
  currentTopicId: null
};

// Helper function to get public key from private key
function getPublicKey(privateKeyBytes: Uint8Array): string {
  return Buffer.from(schnorr.getPublicKey(privateKeyBytes)).toString('hex');
}

// Create topic thunk
export const createTopic = createAsyncThunk(
  'topic/createTopic',
  async (
    {
      name,
      slug,
      description,
      rules,
      image,
      banner,
      moderationSettings,
      privateKey
    }: {
      name: string;
      slug: string;
      description: string;
      rules: string[];
      image?: string;
      banner?: string;
      moderationSettings: {
        moderationType: 'pre-approval' | 'post-publication' | 'hybrid';
        autoApproveAfter?: number;
        requireLightningDeposit?: boolean;
        depositAmount?: number;
      };
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Generate a unique identifier for the topic
      const dIdentifier = `${slug}-${Date.now().toString(36)}`;
      
      // Create the topic content
      const topicContent = {
        description,
        rules,
        image,
        banner,
        moderationSettings
      };
      
      // Create the topic event
      const event: Event = {
        kind: 34550, // NIP-72 topic definition
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', dIdentifier],
          ['name', name],
          ['client', 'xeadline'],
          ['xd', 'topic']
        ],
        content: JSON.stringify(topicContent),
        pubkey: '', // Will be filled in
        id: '', // Will be filled in
        sig: '' // Will be filled in
      };
      
      let signedEvent: Event;
      
      // Sign the event
      if (typeof window !== 'undefined' && window.nostr) {
        // Use Nostr extension
        event.pubkey = await window.nostr.getPublicKey();
        signedEvent = await window.nostr.signEvent(event);
      } else if (privateKey) {
        // Use provided private key
        const pubkey = getPublicKey(hexToBytes(privateKey));
        event.pubkey = pubkey;
        
        // Sign the event
        event.id = getEventHash(event);
        const sig = schnorr.sign(event.id, privateKey);
        event.sig = Buffer.from(sig).toString('hex');
        signedEvent = event;
      } else {
        return rejectWithValue('No signing method available');
      }
      
      // Publish the event
      // For now, we'll just simulate publishing
      // In a real implementation, you would use nostrService.publishEvent(signedEvent)
      console.log('Publishing topic event:', signedEvent);
      
      // Create the topic object
      const topic: Topic = {
        id: `${signedEvent.pubkey}:${dIdentifier}`,
        name,
        slug,
        description,
        rules,
        image,
        banner,
        moderators: [signedEvent.pubkey], // Creator is the initial moderator
        createdAt: signedEvent.created_at,
        pubkey: signedEvent.pubkey,
        moderationSettings,
        memberCount: 1 // Creator is the first member
      };
      
      // Create slug mapping in the database
      try {
        await fetch('/api/topic/slug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug, topicId: topic.id }),
        });
      } catch (error) {
        console.error('Error creating slug mapping:', error);
        // Continue even if slug mapping fails
      }
      
      return topic;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create topic');
    }
  }
);

// Fetch topic thunk
export const fetchTopic = createAsyncThunk(
  'topic/fetchTopic',
  async (topicId: string, { rejectWithValue }) => {
    try {
      // Parse the topic ID to get pubkey and d-identifier
      const [pubkey, dIdentifier] = topicId.split(':');
      
      if (!pubkey || !dIdentifier) {
        return rejectWithValue('Invalid topic ID format');
      }
      
      // For now, we'll just return a mock topic
      // In a real implementation, you would fetch from Nostr relays
      const mockTopic: Topic = {
        id: topicId,
        name: `Topic ${dIdentifier}`,
        slug: dIdentifier,
        description: 'This is a mock topic for development purposes.',
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [pubkey],
        createdAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        pubkey,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 10
      };
      
      return mockTopic;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch topic');
    }
  }
);

// Fetch trending topics thunk
export const fetchTrendingTopics = createAsyncThunk(
  'topic/fetchTrendingTopics',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll just return mock topics
      // In a real implementation, you would fetch from Nostr relays
      const mockTopics: Topic[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `pubkey${i}:trending-topic-${i}`,
        name: `Trending Topic ${i + 1}`,
        slug: `trending-topic-${i + 1}`.toLowerCase().replace(/\s+/g, '-'),
        description: `This is trending topic ${i + 1}.`,
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [`pubkey${i}`],
        createdAt: Math.floor(Date.now() / 1000) - 86400 * (i + 1),
        pubkey: `pubkey${i}`,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 100 - i * 10
      }));
      
      return mockTopics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch trending topics');
    }
  }
);

// Fetch new topics thunk
export const fetchNewTopics = createAsyncThunk(
  'topic/fetchNewTopics',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll just return mock topics
      // In a real implementation, you would fetch from Nostr relays
      const mockTopics: Topic[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `pubkey${i}:new-topic-${i}`,
        name: `New Topic ${i + 1}`,
        slug: `new-topic-${i + 1}`.toLowerCase().replace(/\s+/g, '-'),
        description: `This is new topic ${i + 1}.`,
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [`pubkey${i}`],
        createdAt: Math.floor(Date.now() / 1000) - 3600 * (i + 1), // Hours ago
        pubkey: `pubkey${i}`,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 5 - i
      }));
      
      return mockTopics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch new topics');
    }
  }
);

// Subscribe to topic thunk
export const subscribeToTopic = createAsyncThunk(
  'topic/subscribeToTopic',
  async (
    {
      topicId,
      privateKey
    }: {
      topicId: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // For now, we'll just return the topic ID
      // In a real implementation, you would publish a subscription event to Nostr relays
      console.log(`Subscribing to topic: ${topicId}`);
      return topicId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to subscribe to topic');
    }
  }
);

// Unsubscribe from topic thunk
export const unsubscribeFromTopic = createAsyncThunk(
  'topic/unsubscribeFromTopic',
  async (
    {
      topicId,
      privateKey
    }: {
      topicId: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // For now, we'll just return the topic ID
      // In a real implementation, you would publish an unsubscription event to Nostr relays
      console.log(`Unsubscribing from topic: ${topicId}`);
      return topicId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to unsubscribe from topic');
    }
  }
);

// Create the topic slice
export const topicSlice = createSlice({
  name: 'topic',
  initialState,
  reducers: {
    setCurrentTopic: (state, action: PayloadAction<string>) => {
      state.currentTopicId = action.payload;
    },
    clearCurrentTopic: (state) => {
      state.currentTopicId = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create topic
      .addCase(createTopic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTopic.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        state.allIds.push(action.payload.id);
        state.subscribed.push(action.payload.id);
        state.new.unshift(action.payload.id);
        state.currentTopicId = action.payload.id;
      })
      .addCase(createTopic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch topic
      .addCase(fetchTopic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTopic.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        if (!state.allIds.includes(action.payload.id)) {
          state.allIds.push(action.payload.id);
        }
        state.currentTopicId = action.payload.id;
      })
      .addCase(fetchTopic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch trending topics
      .addCase(fetchTrendingTopics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrendingTopics.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add topics to byId and allIds
        action.payload.forEach(topic => {
          state.byId[topic.id] = topic;
          if (!state.allIds.includes(topic.id)) {
            state.allIds.push(topic.id);
          }
        });
        
        // Update trending list
        state.trending = action.payload.map(topic => topic.id);
      })
      .addCase(fetchTrendingTopics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch new topics
      .addCase(fetchNewTopics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewTopics.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add topics to byId and allIds
        action.payload.forEach(topic => {
          state.byId[topic.id] = topic;
          if (!state.allIds.includes(topic.id)) {
            state.allIds.push(topic.id);
          }
        });
        
        // Update new list
        state.new = action.payload.map(topic => topic.id);
      })
      .addCase(fetchNewTopics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Subscribe to topic
      .addCase(subscribeToTopic.fulfilled, (state, action) => {
        if (!state.subscribed.includes(action.payload)) {
          state.subscribed.push(action.payload);
        }
      })
      
      // Unsubscribe from topic
      .addCase(unsubscribeFromTopic.fulfilled, (state, action) => {
        state.subscribed = state.subscribed.filter(id => id !== action.payload);
      });
  }
});

// Export actions
export const { setCurrentTopic, clearCurrentTopic, clearError } = topicSlice.actions;

import { createSelector } from '@reduxjs/toolkit';

// Basic selectors
export const selectTopics = (state: RootState) => state.topic.byId;
export const selectAllTopicIds = (state: RootState) => state.topic.allIds;
export const selectSubscribedIds = (state: RootState) => state.topic.subscribed;
export const selectTrendingIds = (state: RootState) => state.topic.trending;
export const selectNewIds = (state: RootState) => state.topic.new;
export const selectCurrentTopicId = (state: RootState) => state.topic.currentTopicId;
export const selectTopicLoading = (state: RootState) => state.topic.loading;
export const selectTopicError = (state: RootState) => state.topic.error;

// Memoized selectors
export const selectSubscribedTopics = createSelector(
  [selectTopics, selectSubscribedIds],
  (topics, subscribedIds) => subscribedIds.map((id: string) => topics[id]).filter(Boolean)
);

export const selectTrendingTopics = createSelector(
  [selectTopics, selectTrendingIds],
  (topics, trendingIds) => trendingIds.map((id: string) => topics[id]).filter(Boolean)
);

export const selectNewTopics = createSelector(
  [selectTopics, selectNewIds],
  (topics, newIds) => newIds.map((id: string) => topics[id]).filter(Boolean)
);

export const selectCurrentTopic = createSelector(
  [selectTopics, selectCurrentTopicId],
  (topics, currentId) => currentId ? topics[currentId] : null
);

export const selectIsSubscribed = (state: RootState, topicId: string) =>
  state.topic.subscribed.includes(topicId);

export default topicSlice.reducer;