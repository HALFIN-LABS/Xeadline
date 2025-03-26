import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectCurrentUser, selectIsAuthenticated, selectIsAuthInitialized } from '@/redux/slices/authSlice';
import { setCurrentProfile, selectCurrentProfile } from '@/redux/slices/profileSlice';
import { fetchUserProfile } from '@/services/profileService';
import nostrService from '@/services/nostr/nostrService';

/**
 * Hook to keep the user's profile data in sync with Nostr events
 * Subscribes to metadata events for the current user and updates the profile in Redux
 * Ensures the most recent profile data is always used
 * Now depends on auth initialization state to prevent race conditions
 */
export const useProfileSync = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);
  const currentProfile = useAppSelector(selectCurrentProfile);

  useEffect(() => {
    // Only proceed if auth is initialized and we have a logged-in user
    if (!isAuthInitialized) {
      console.log('ProfileSync: Waiting for auth initialization to complete');
      return;
    }
    
    if (!isAuthenticated || !currentUser?.publicKey) {
      console.log('ProfileSync: User not authenticated or no public key available');
      return;
    }

    const publicKey = currentUser.publicKey;
    console.log('ProfileSync: Setting up profile sync for user:', publicKey);
    
    // Initial fetch of profile data
    const fetchProfile = async () => {
      try {
        console.log('ProfileSync: Fetching initial profile data');
        const profile = await fetchUserProfile(publicKey);
        if (profile) {
          console.log('ProfileSync: Initial profile data fetched successfully');
          dispatch(setCurrentProfile(profile));
        }
      } catch (error) {
        console.error('ProfileSync: Error fetching profile:', error);
      }
    };
    
    fetchProfile();
    
    // Subscribe to metadata events for this user
    const subId = `profile-sync-${publicKey}-${Date.now()}`;
    
    nostrService.subscribe(
      subId,
      [{ kinds: [0], authors: [publicKey] }],
      async (event) => {
        try {
          // Only fetch and update if this event is newer than our current profile data
          // or if we don't have a profile yet
          const currentLastUpdated = currentProfile?.lastUpdated || 0;
          if (!currentProfile || event.created_at > currentLastUpdated) {
            console.log('ProfileSync: Received newer profile metadata, updating...');
            
            // Fetch the updated profile
            const profile = await fetchUserProfile(publicKey);
            if (profile) {
              dispatch(setCurrentProfile(profile));
            }
          }
        } catch (error) {
          console.error('ProfileSync: Error processing profile update:', error);
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      console.log('ProfileSync: Cleaning up profile sync subscription');
      nostrService.unsubscribe(subId);
    };
  }, [currentUser, isAuthenticated, isAuthInitialized, dispatch, currentProfile]);
};

export default useProfileSync;