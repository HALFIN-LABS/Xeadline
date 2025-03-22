import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { fetchReactionsForContent } from '../../services/nostr/reactionService';

interface UpdateVotePayload {
  contentId: string;
  contentType: 'post' | 'comment';
  newVote: 'up' | 'down' | null;
  voteCount: number;
}

interface VoteState {
  votes: Record<string, { vote: 'up' | 'down' | null; count: number }>;
  loading: boolean;
  error: string | null;
}

const initialState: VoteState = {
  votes: {},
  loading: false,
  error: null
};

// Fetch votes for content
export const fetchVotesForContent = createAsyncThunk(
  'vote/fetchVotesForContent',
  async (contentIds: string[], thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState;
      const currentUserPubkey = state.auth.currentUser?.publicKey;
      
      const reactions = await fetchReactionsForContent(contentIds, currentUserPubkey);
      
      return reactions;
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch votes');
    }
  }
);

export const voteSlice = createSlice({
  name: 'vote',
  initialState,
  reducers: {
    updateVote: (state, action: PayloadAction<UpdateVotePayload>) => {
      const { contentId, newVote, voteCount } = action.payload;
      
      state.votes[contentId] = {
        vote: newVote,
        count: voteCount
      };
    },
    clearVotes: (state) => {
      state.votes = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVotesForContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVotesForContent.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update votes with fetched data
        for (const [contentId, data] of Object.entries(action.payload)) {
          state.votes[contentId] = {
            vote: data.userVote,
            count: data.likes
          };
        }
      })
      .addCase(fetchVotesForContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { updateVote, clearVotes } = voteSlice.actions;

// Selectors
export const selectVoteForContent = (state: RootState, contentId: string) => 
  state.vote.votes[contentId] || { vote: null, count: 0 };

export default voteSlice.reducer;