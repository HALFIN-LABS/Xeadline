import { useState, useEffect } from 'react';
import { fetchUserProfile, ProfileData } from '../services/profileService';

/**
 * Hook to fetch and cache user profile data
 * 
 * @param pubkey - The public key of the user
 * @returns The user profile data and loading state
 */
export function useUserProfile(pubkey: string) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const profileData = await fetchUserProfile(pubkey);
        
        if (isMounted) {
          setProfile(profileData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch profile');
          setLoading(false);
        }
      }
    };

    // Check if we already have the profile data
    if (!profile || profile.publicKey !== pubkey) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [pubkey, profile]);

  return { profile, loading, error };
}