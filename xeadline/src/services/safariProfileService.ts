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
  
  // Generate a simple static profile
  const staticProfile: ProfileData = {
    publicKey,
    name: 'Safari User',
    displayName: 'Safari User',
    about: 'Safari compatibility mode is active. Profile data is not available due to browser restrictions.',
    picture: 'https://robohash.org/safari?set=set3&size=200x200',
    banner: undefined,
    nip05: undefined,
    lud16: undefined,
    website: undefined,
    isVerified: false,
    lastUpdated: Math.floor(Date.now() / 1000)
  };
  
  return staticProfile;
}