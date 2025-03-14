import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectCurrentUser, selectIsAuthenticated } from '@/redux/slices/authSlice';
import { setCurrentProfile, selectCurrentProfile } from '@/redux/slices/profileSlice';
import nostrService from '@/services/nostr/nostrService';
import { fetchUserProfile } from '@/services/profileService';

/**
 * Hook to keep the user's profile data in sync with Nostr events
 * Subscribes to metadata events for the current user and updates the profile in Redux
 * Ensures the most recent profile data is always used
 */
export const useProfileSync = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentProfile = useAppSelector(selectCurrentProfile);

  useEffect(() => {
    // Only proceed if we have a logged-in user
    if (!isAuthenticated || !currentUser?.publicKey) return;

    const publicKey = currentUser.publicKey;
    console.log('Setting up profile sync for user:', publicKey);
    
    // Initial fetch of profile data
    const fetchProfile = async () => {
      try {
        console.log('Fetching initial profile data');
        const profile = await fetchUserProfile(publicKey);
        if (profile) {
          console.log('Initial profile data:', profile);
          if (profile.lastUpdated) {
            console.log('Profile last updated:', new Date(profile.lastUpdated * 1000).toISOString());
          }
          dispatch(setCurrentProfile(profile));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchProfile();
    
    // Subscribe to metadata events for this user
    const subId = `profile-sync-${publicKey}-${Date.now()}`;
    console.log('Creating subscription:', subId);
    
    nostrService.subscribe(
      subId,
      // Remove limit to get all events
      [{ kinds: [0], authors: [publicKey] }],
      async (event) => {
        try {
          console.log('Received profile metadata update:', event);
          console.log('Event timestamp:', new Date(event.created_at * 1000).toISOString());
          
          // Only fetch and update if this event is newer than our current profile data
          // or if we don't have a profile yet
          const currentLastUpdated = currentProfile?.lastUpdated || 0;
          if (!currentProfile || event.created_at > currentLastUpdated) {
            console.log('Event is newer than current profile data, fetching updated profile');
            
            // Fetch the updated profile
            const profile = await fetchUserProfile(publicKey);
            if (profile) {
              console.log('Updated profile data:', profile);
              if (profile.lastUpdated) {
                console.log('Profile last updated:', new Date(profile.lastUpdated * 1000).toISOString());
              }
              dispatch(setCurrentProfile(profile));
            }
          } else {
            console.log('Event is older than current profile data, ignoring');
          }
        } catch (error) {
          console.error('Error processing profile update:', error);
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      console.log('Cleaning up profile sync subscription');
      nostrService.unsubscribe(subId);
    };
  }, [currentUser, isAuthenticated, dispatch, currentProfile]);
};

export default useProfileSync;