import { useState, useEffect } from 'react';
import { ProfileData } from '../services/profileService';
import { getUserProfile, formatUsername } from '../services/userProfileService';

/**
 * Hook to fetch and cache user profile data from both Supabase and Nostr
 * 
 * @param pubkey - The public key of the user
 * @returns The user profile data, loading state, and formatted username
 */
export function useUserProfileWithCache(pubkey: string) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>(`${pubkey.substring(0, 8)}...`);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get profile from combined service
        const profileData = await getUserProfile(pubkey);
        
        if (isMounted) {
          setProfile(profileData);
          
          // Format the username
          const formattedUsername = formatUsername(pubkey, profileData);
          setUsername(formattedUsername);
          
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch profile');
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [pubkey]);

  return { profile, loading, error, username };
}