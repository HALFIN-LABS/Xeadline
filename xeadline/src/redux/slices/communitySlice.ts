import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Event, getEventHash, signEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';

// Define types
export interface Community {
  id: string; // Format: <pubkey>:<d-identifier>
  name: string;
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

export interface CommunityState {
  byId: Record<string, Community>;
  allIds: string[];
  subscribed: string[];
  trending: string[];
  new: string[];
  loading: boolean;
  error: string | null;
  currentCommunityId: string | null;
}

const initialState: CommunityState = {
  byId: {},
  allIds: [],
  subscribed: [],
  trending: [],
  new: [],
  loading: false,
  error: null,
  currentCommunityId: null
};

// Helper function to get public key from private key
function getPublicKey(privateKeyBytes: Uint8Array): string {
  return Buffer.from(schnorr.getPublicKey(privateKeyBytes)).toString('hex');
}

// Create community thunk
export const createCommunity = createAsyncThunk(
  'community/createCommunity',
  async (
    {
      name,
      description,
      rules,
      image,
      banner,
      moderationSettings,
      privateKey
    }: {
      name: string;
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
      // Generate a unique identifier for the community
      const dIdentifier = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
      
      // Create the community content
      const communityContent = {
        description,
        rules,
        image,
        banner,
        moderationSettings
      };
      
      // Create the community event
      const event: Event = {
        kind: 34550, // NIP-72 community definition
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', dIdentifier],
          ['name', name],
          ['client', 'xeadline'],
          ['xd', 'community']
        ],
        content: JSON.stringify(communityContent),
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
      console.log('Publishing community event:', signedEvent);
      
      // Create the community object
      const community: Community = {
        id: `${signedEvent.pubkey}:${dIdentifier}`,
        name,
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
      
      return community;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create community');
    }
  }
);

// Fetch community thunk
export const fetchCommunity = createAsyncThunk(
  'community/fetchCommunity',
  async (communityId: string, { rejectWithValue }) => {
    try {
      // Parse the community ID to get pubkey and d-identifier
      const [pubkey, dIdentifier] = communityId.split(':');
      
      if (!pubkey || !dIdentifier) {
        return rejectWithValue('Invalid community ID format');
      }
      
      // For now, we'll just return a mock community
      // In a real implementation, you would fetch from Nostr relays
      const mockCommunity: Community = {
        id: communityId,
        name: `Community ${dIdentifier}`,
        description: 'This is a mock community for development purposes.',
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [pubkey],
        createdAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        pubkey,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 10
      };
      
      return mockCommunity;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch community');
    }
  }
);

// Fetch trending communities thunk
export const fetchTrendingCommunities = createAsyncThunk(
  'community/fetchTrendingCommunities',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll just return mock communities
      // In a real implementation, you would fetch from Nostr relays
      const mockCommunities: Community[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `pubkey${i}:trending-community-${i}`,
        name: `Trending Community ${i + 1}`,
        description: `This is trending community ${i + 1}.`,
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [`pubkey${i}`],
        createdAt: Math.floor(Date.now() / 1000) - 86400 * (i + 1),
        pubkey: `pubkey${i}`,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 100 - i * 10
      }));
      
      return mockCommunities;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch trending communities');
    }
  }
);

// Fetch new communities thunk
export const fetchNewCommunities = createAsyncThunk(
  'community/fetchNewCommunities',
  async (_, { rejectWithValue }) => {
    try {
      // For now, we'll just return mock communities
      // In a real implementation, you would fetch from Nostr relays
      const mockCommunities: Community[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `pubkey${i}:new-community-${i}`,
        name: `New Community ${i + 1}`,
        description: `This is new community ${i + 1}.`,
        rules: ['Be respectful', 'Stay on topic'],
        moderators: [`pubkey${i}`],
        createdAt: Math.floor(Date.now() / 1000) - 3600 * (i + 1), // Hours ago
        pubkey: `pubkey${i}`,
        moderationSettings: {
          moderationType: 'post-publication'
        },
        memberCount: 5 - i
      }));
      
      return mockCommunities;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch new communities');
    }
  }
);

// Subscribe to community thunk
export const subscribeToCommunity = createAsyncThunk(
  'community/subscribeToCommunity',
  async (
    {
      communityId,
      privateKey
    }: {
      communityId: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // For now, we'll just return the community ID
      // In a real implementation, you would publish a subscription event to Nostr relays
      console.log(`Subscribing to community: ${communityId}`);
      return communityId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to subscribe to community');
    }
  }
);

// Unsubscribe from community thunk
export const unsubscribeFromCommunity = createAsyncThunk(
  'community/unsubscribeFromCommunity',
  async (
    {
      communityId,
      privateKey
    }: {
      communityId: string;
      privateKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // For now, we'll just return the community ID
      // In a real implementation, you would publish an unsubscription event to Nostr relays
      console.log(`Unsubscribing from community: ${communityId}`);
      return communityId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to unsubscribe from community');
    }
  }
);

// Create the community slice
export const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {
    setCurrentCommunity: (state, action: PayloadAction<string>) => {
      state.currentCommunityId = action.payload;
    },
    clearCurrentCommunity: (state) => {
      state.currentCommunityId = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create community
      .addCase(createCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCommunity.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        state.allIds.push(action.payload.id);
        state.subscribed.push(action.payload.id);
        state.new.unshift(action.payload.id);
        state.currentCommunityId = action.payload.id;
      })
      .addCase(createCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch community
      .addCase(fetchCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunity.fulfilled, (state, action) => {
        state.loading = false;
        state.byId[action.payload.id] = action.payload;
        if (!state.allIds.includes(action.payload.id)) {
          state.allIds.push(action.payload.id);
        }
        state.currentCommunityId = action.payload.id;
      })
      .addCase(fetchCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch trending communities
      .addCase(fetchTrendingCommunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrendingCommunities.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add communities to byId and allIds
        action.payload.forEach(community => {
          state.byId[community.id] = community;
          if (!state.allIds.includes(community.id)) {
            state.allIds.push(community.id);
          }
        });
        
        // Update trending list
        state.trending = action.payload.map(community => community.id);
      })
      .addCase(fetchTrendingCommunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch new communities
      .addCase(fetchNewCommunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewCommunities.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add communities to byId and allIds
        action.payload.forEach(community => {
          state.byId[community.id] = community;
          if (!state.allIds.includes(community.id)) {
            state.allIds.push(community.id);
          }
        });
        
        // Update new list
        state.new = action.payload.map(community => community.id);
      })
      .addCase(fetchNewCommunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Subscribe to community
      .addCase(subscribeToCommunity.fulfilled, (state, action) => {
        if (!state.subscribed.includes(action.payload)) {
          state.subscribed.push(action.payload);
        }
      })
      
      // Unsubscribe from community
      .addCase(unsubscribeFromCommunity.fulfilled, (state, action) => {
        state.subscribed = state.subscribed.filter(id => id !== action.payload);
      });
  }
});

// Export actions
export const { setCurrentCommunity, clearCurrentCommunity, clearError } = communitySlice.actions;

// Export selectors
export const selectCommunities = (state: RootState) => state.community.byId;
export const selectAllCommunityIds = (state: RootState) => state.community.allIds;
export const selectSubscribedCommunities = (state: RootState) => 
  state.community.subscribed.map(id => state.community.byId[id]).filter(Boolean);
export const selectTrendingCommunities = (state: RootState) => 
  state.community.trending.map(id => state.community.byId[id]).filter(Boolean);
export const selectNewCommunities = (state: RootState) => 
  state.community.new.map(id => state.community.byId[id]).filter(Boolean);
export const selectCurrentCommunity = (state: RootState) => 
  state.community.currentCommunityId ? state.community.byId[state.community.currentCommunityId] : null;
export const selectCommunityLoading = (state: RootState) => state.community.loading;
export const selectCommunityError = (state: RootState) => state.community.error;
export const selectIsSubscribed = (state: RootState, communityId: string) => 
  state.community.subscribed.includes(communityId);

export default communitySlice.reducer;