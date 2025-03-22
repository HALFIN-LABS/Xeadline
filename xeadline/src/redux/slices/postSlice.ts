import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Filter } from 'nostr-tools';
import nostrService from '../../services/nostr/nostrService';
import { EVENT_TYPES } from '../../constants/eventTypes';

// Define types
export interface Post {
  id: string;
  content: {
    title: string;
    text?: string;
    url?: string;
    media?: string[];
    mediaTypes?: ('image' | 'video' | 'gif')[];
    thumbnails?: string[];
    type: 'text' | 'link' | 'media' | 'poll';
    linkPreview?: string; // JSON string of LinkPreviewData
  };
  pubkey: string;
  topicId: string;
  createdAt: number;
  tags: string[][];
  likes: number;
  comments: number;
  userVote?: 'up' | 'down' | null; // User's vote on this post
}

export interface PostState {
  byId: Record<string, Post>;
  byTopic: Record<string, string[]>;
  loading: boolean;
  error: string | null;
}

const initialState: PostState = {
  byId: {},
  byTopic: {},
  loading: false,
  error: null
};

// Fetch posts for a topic
export const fetchPostsForTopic = createAsyncThunk(
  'post/fetchPostsForTopic',
  async (topicId: string, { rejectWithValue }) => {
    try {
      console.log(`Fetching posts for topic: ${topicId}`);
      
      // Create filter to get all posts for this topic
      const filters: Filter[] = [
        {
          // Query for all Xeadline custom post types
          kinds: [
            EVENT_TYPES.TEXT_POST,   // 33301
            EVENT_TYPES.MEDIA_POST,  // 33302
            EVENT_TYPES.LINK_POST,   // 33303
            EVENT_TYPES.POLL_POST    // 33304
          ],
          '#t': [topicId], // Filter by topic ID
          limit: 50
        }
      ];
      
      // Fetch events from Nostr relays
      const events = await nostrService.getEvents(filters);
      console.log(`Found ${events.length} post events for topic ${topicId}`);
      
      // Process events to create post objects
      const posts: Post[] = [];
      
      for (const event of events) {
        try {
          // Parse the content
          const contentData = JSON.parse(event.content);
          
          // Create the post object
          const post: Post = {
            id: event.id,
            content: {
              title: contentData.title || 'Untitled Post',
              text: contentData.text,
              url: contentData.url,
              media: contentData.media,
              type: contentData.type || 'text'
            },
            pubkey: event.pubkey,
            topicId,
            createdAt: event.created_at,
            tags: event.tags,
            likes: 0, // Placeholder, would need to count actual likes
            comments: 0 // Placeholder, would need to count actual comments
          };
          
          posts.push(post);
        } catch (error) {
          console.error(`Error processing post event ${event.id}:`, error);
          // Skip this event and continue with the next one
        }
      }
      
      // Sort posts by creation time (newest first)
      posts.sort((a, b) => b.createdAt - a.createdAt);
      
      return { topicId, posts };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch posts');
    }
  }
);

// Create the post slice
export const postSlice = createSlice({
  name: 'post',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch posts for topic
      .addCase(fetchPostsForTopic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostsForTopic.fulfilled, (state, action) => {
        state.loading = false;
        
        const { topicId, posts } = action.payload;
        
        // Add posts to byId
        posts.forEach(post => {
          state.byId[post.id] = post;
        });
        
        // Update byTopic
        state.byTopic[topicId] = posts.map(post => post.id);
      })
      .addCase(fetchPostsForTopic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearError } = postSlice.actions;

// Selectors
export const selectPostsLoading = (state: RootState) => state.post.loading;
export const selectPostsError = (state: RootState) => state.post.error;
export const selectPostsByTopic = (state: RootState, topicId: string) => {
  const postIds = state.post.byTopic[topicId] || [];
  return postIds.map(id => state.post.byId[id]);
};

export default postSlice.reducer;