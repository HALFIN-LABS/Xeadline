/**
 * User Profile Service
 * 
 * This service combines data from Supabase and Nostr to provide user profile information
 * with a focus on NIP-05 verification and username display.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchUserProfile, ProfileData } from './profileService';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// In-memory cache to avoid redundant fetches
const profileCache: Record<string, {
  data: ProfileData | null;
  timestamp: number;
  ttl: number;
}> = {};

// Cache TTL in milliseconds (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if a profile exists in the cache and is still valid
 */
function getFromCache(pubkey: string): ProfileData | null {
  const cached = profileCache[pubkey];
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  return null;
}

/**
 * Add a profile to the cache
 */
function addToCache(pubkey: string, profile: ProfileData | null, ttl = DEFAULT_CACHE_TTL): void {
  profileCache[pubkey] = {
    data: profile,
    timestamp: Date.now(),
    ttl
  };
}

/**
 * Check Supabase for a NIP-05 username
 */
async function checkSupabaseForNip05(pubkey: string): Promise<{ nip05?: string; isVerified: boolean }> {
  try {
    // Check the nip05_usernames table for a username assigned to this pubkey
    const { data, error } = await supabase
      .from('nip05_usernames')
      .select('username')
      .eq('pubkey', pubkey)
      .single();

    if (error || !data) {
      return { isVerified: false };
    }

    // If we found a username, it's a verified xead.space username
    return {
      nip05: `${data.username}@xead.space`,
      isVerified: true
    };
  } catch (error) {
    console.error('Error checking Supabase for NIP-05:', error);
    return { isVerified: false };
  }
}

/**
 * Get user profile data with NIP-05 verification
 * Checks both Supabase and Nostr for user information
 */
export async function getUserProfile(pubkey: string): Promise<ProfileData | null> {
  // Check cache first
  const cachedProfile = getFromCache(pubkey);
  if (cachedProfile) {
    return cachedProfile;
  }

  try {
    // First check Supabase for a NIP-05 username
    const supabaseResult = await checkSupabaseForNip05(pubkey);
    
    // If we found a verified username in Supabase, create a profile with it
    if (supabaseResult.isVerified && supabaseResult.nip05) {
      const profile: ProfileData = {
        publicKey: pubkey,
        nip05: supabaseResult.nip05,
        isVerified: true,
        lastUpdated: Math.floor(Date.now() / 1000)
      };
      
      // Add to cache
      addToCache(pubkey, profile);
      return profile;
    }
    
    // If not found in Supabase, check Nostr
    const nostrProfile = await fetchUserProfile(pubkey);
    
    // Add to cache (even if null)
    addToCache(pubkey, nostrProfile);
    return nostrProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Format a username for display
 * If a NIP-05 identifier is available and verified, it will be used
 * Otherwise, the public key will be truncated and displayed
 */
export function formatUsername(pubkey: string, profile: ProfileData | null): string {
  // If profile exists and has a verified NIP-05, use it
  if (profile?.nip05 && profile.isVerified) {
    return profile.nip05;
  }
  
  // Otherwise, truncate the public key
  return `${pubkey.substring(0, 8)}...`;
}