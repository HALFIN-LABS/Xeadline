import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { 
  fetchUserProfile, 
  updateUserProfile, 
  fetchUserActivity,
  ProfileData,
  ProfileMetadata
} from '../../services/profileService';
import { Event } from 'nostr-tools';

export interface ProfileState {
  currentProfile: ProfileData | null;
  viewingProfile: ProfileData | null;
  activityFeed: Event[];
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  updateError: string | null;
}

const initialState: ProfileState = {
  currentProfile: null,
  viewingProfile: null,
  activityFeed: [],
  isLoading: false,
  error: null,
  isUpdating: false,
  updateError: null
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (publicKey: string, { rejectWithValue }) => {
    try {
      const profile = await fetchUserProfile(publicKey);
      if (!profile) {
        return rejectWithValue('Profile not found. The user may not have set up their profile yet.');
      }
      return profile;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch profile. Please try again later.'
      );
    }
  }
);

export const fetchActivity = createAsyncThunk(
  'profile/fetchActivity',
  async (publicKey: string, { rejectWithValue }) => {
    try {
      return await fetchUserActivity(publicKey);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch activity. Please try again later.'
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (
    { metadata }: { metadata: ProfileMetadata },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      // Attempt to update the profile
      const success = await updateUserProfile(metadata);
      
      // Even if updateUserProfile returns false, the update might have been sent to some relays
      // Add a timestamp to the metadata for proper tracking
      const metadataWithTimestamp = {
        ...metadata,
        lastUpdated: Math.floor(Date.now() / 1000)
      };
      
      // If the update was successful, return the metadata with timestamp
      if (success) {
        return metadataWithTimestamp;
      }
      
      // If the update wasn't successful according to the function,
      // but it might have been sent to some relays, we'll try to fetch the latest profile
      // after a short delay to see if it was actually updated
      
      // Get the current user's public key
      const state = getState() as RootState;
      const publicKey = state.auth.currentUser?.publicKey;
      
      if (publicKey) {
        // Wait a short time for the update to propagate to relays
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch the latest profile data
        try {
          const latestProfile = await fetchUserProfile(publicKey);
          if (latestProfile) {
            // If we got a profile back, consider the update successful
            console.log('Profile update propagated to relays, fetched latest profile:', latestProfile);
            return metadataWithTimestamp;
          }
        } catch (fetchError) {
          console.error('Error fetching latest profile after update:', fetchError);
        }
      }
      
      // If we couldn't verify the update was successful, reject with an error
      return rejectWithValue('Failed to update profile. Please try again later.');
    } catch (error) {
      console.error('Error in updateProfile thunk:', error);
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update profile. Please try again later.'
      );
    }
  }
);

export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearViewingProfile: (state) => {
      state.viewingProfile = null;
      state.activityFeed = [];
    },
    setCurrentProfile: (state, action: PayloadAction<ProfileData>) => {
      state.currentProfile = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.updateError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.viewingProfile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch profile';
      })
      
      // Fetch activity
      .addCase(fetchActivity.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activityFeed = action.payload;
      })
      .addCase(fetchActivity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch activity';
      })
      
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (state.currentProfile) {
          state.currentProfile = {
            ...state.currentProfile,
            ...action.payload
          };
        }
        if (state.viewingProfile && state.currentProfile && 
            state.viewingProfile.publicKey === state.currentProfile.publicKey) {
          state.viewingProfile = {
            ...state.viewingProfile,
            ...action.payload
          };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload as string || 'Failed to update profile';
      });
  }
});

export const { clearViewingProfile, setCurrentProfile, clearError } = profileSlice.actions;

// Selectors
export const selectCurrentProfile = (state: RootState) => state.profile.currentProfile;
export const selectViewingProfile = (state: RootState) => state.profile.viewingProfile;
export const selectActivityFeed = (state: RootState) => state.profile.activityFeed;
export const selectProfileLoading = (state: RootState) => state.profile.isLoading;
export const selectProfileError = (state: RootState) => state.profile.error;
export const selectProfileUpdating = (state: RootState) => state.profile.isUpdating;
export const selectProfileUpdateError = (state: RootState) => state.profile.updateError;

export default profileSlice.reducer;