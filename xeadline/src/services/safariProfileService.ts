/**
 * Safari Profile Service
 *
 * This service provides a static fallback for Safari browsers
 * to display profile information without relying on WebSockets.
 */

import { ProfileData } from './profileService';

// Check if running in Safari
export const isSafari = typeof navigator !== 'undefined' &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/**
 * Creates a static fallback profile for Safari users
 *
 * @param publicKey - The public key of the user
 * @returns Promise resolving to the profile data
 */
export async function fetchSafariProfile(publicKey: string): Promise<ProfileData | null> {
  console.log('Using static fallback profile for Safari');
  
  // Default values for Safari fallback
  let name = 'Safari User';
  let displayName = 'Safari User';
  let nip05 = undefined;
  let isVerified = false;
  
  // Try to get user info from database
  try {
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Query the database for this public key
    const { data, error } = await supabase
      .from('nip05_usernames')
      .select('username')
      .eq('pubkey', publicKey)
      .single();
    
    if (!error && data) {
      console.log('Safari fallback: Found user in database:', data);
      name = data.username;
      displayName = data.username;
      nip05 = `${data.username}@xead.space`;
      isVerified = true;
    }
  } catch (error) {
    console.error('Safari fallback: Error querying database:', error);
  }
  
  // Generate a simple static profile
  const staticProfile: ProfileData = {
    publicKey,
    name,
    displayName,
    about: 'Safari compatibility mode is active. Profile data is not available due to browser restrictions.',
    picture: 'https://robohash.org/safari?set=set3&size=200x200',
    banner: undefined,
    nip05,
    lud16: undefined,
    website: undefined,
    isVerified,
    lastUpdated: Math.floor(Date.now() / 1000)
  };
  
  return staticProfile;
}