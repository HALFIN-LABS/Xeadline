/**
 * Profile Service
 * 
 * This service handles user profile operations including:
 * - Fetching profile information
 * - Updating profile information
 * - NIP-05 verification
 * - Profile image handling
 * - User activity feed
 */

import { Event, getEventHash } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import nostrService from './nostr/nostrService';
import { retrievePrivateKey } from '../utils/nostrKeys';
import { isSafari, fetchSafariProfile } from './safariProfileService';

// NIP-01 defines kind 0 as metadata event
const METADATA_KIND = 0;

// NIP-25 defines kind 7 as reaction event
const REACTION_KIND = 7;

// NIP-01 defines kind 1 as text note event
const TEXT_NOTE_KIND = 1;

export interface ProfileMetadata {
  name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string; // Lightning address
  website?: string;
  displayName?: string;
}

export interface ProfileData extends ProfileMetadata {
  publicKey: string;
  isVerified: boolean;
  lastUpdated?: number; // Timestamp of the last profile update
}

/**
 * Verifies a NIP-05 identifier
 * 
 * @param pubkey - The public key to verify
 * @param nip05 - The NIP-05 identifier (user@domain.com)
 * @returns Promise resolving to true if verified
 */
export async function verifyNip05(pubkey: string, nip05: string): Promise<boolean> {
  try {
    const [name, domain] = nip05.split('@');
    if (!name || !domain) return false;

    const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`);
    if (!response.ok) return false;

    const data = await response.json();
    const names = data.names || {};
    const verifiedPubkey = names[name];

    return verifiedPubkey === pubkey;
  } catch (error) {
    console.error('Error verifying NIP-05:', error);
    return false;
  }
}

/**
 * Fetches a user's profile metadata
 * 
 * @param publicKey - The public key of the user
 * @returns Promise resolving to the profile data
 */
export async function fetchUserProfile(publicKey: string): Promise<ProfileData | null> {
  // If running in Safari, use the Safari-specific implementation
  if (isSafari) {
    console.log('Safari detected, using Safari-specific profile fetching');
    return fetchSafariProfile(publicKey);
  }
  
  // Standard implementation for other browsers
  return new Promise((resolve) => {
    let events: Event[] = [];
    let hasResolved = false;
    let timeoutId: NodeJS.Timeout;

    // Subscribe to metadata events for this public key
    const subId = `profile-${publicKey}-${Date.now()}`;
    
    console.log(`Fetching profile for ${publicKey}`);
    
    nostrService.subscribe(
      subId,
      [{ kinds: [METADATA_KIND], authors: [publicKey] }],
      (event) => {
        console.log('Received profile event:', event.id);
        // Collect all events instead of processing immediately
        events.push(event);
      },
      async () => {
        // On EOSE (End of Stored Events), process all collected events
        console.log('EOSE received for profile fetch');
        if (!hasResolved) {
          processLatestEvent();
        }
      }
    );

    // Helper function to process the latest event
    const processLatestEvent = async () => {
      try {
        if (events.length === 0) {
          console.log('No profile events received');
          return;
        }
        
        // Sort events by timestamp (newest first)
        events.sort((a, b) => b.created_at - a.created_at);
        
        // Use the most recent event
        const latestEvent = events[0];
        console.log(`Using profile event with timestamp: ${new Date(latestEvent.created_at * 1000).toISOString()}`);
        
        // Parse content with extra error handling
        let content;
        try {
          content = JSON.parse(latestEvent.content);
        } catch (jsonError) {
          console.error('Error parsing profile JSON:', jsonError);
          console.log('Raw content that failed to parse:', latestEvent.content);
          // Provide a fallback empty object
          content = {};
        }
        
        const profile: ProfileData = {
          publicKey,
          name: content.name,
          about: content.about,
          picture: content.picture,
          banner: content.banner,
          nip05: content.nip05,
          lud16: content.lud16,
          website: content.website,
          displayName: content.display_name,
          isVerified: false, // Will be updated after verification check
          lastUpdated: latestEvent.created_at // Add timestamp for caching
        };

        // Check NIP-05 verification if available
        if (profile.nip05) {
          try {
            const isVerified = await verifyNip05(publicKey, profile.nip05);
            profile.isVerified = isVerified;
          } catch (error) {
            console.error('Error verifying NIP-05:', error);
          }
        }
        
        hasResolved = true;
        clearTimeout(timeoutId);
        nostrService.unsubscribe(subId);
        resolve(profile);
      } catch (error) {
        console.error('Error processing profile metadata:', error);
        hasResolved = true;
        clearTimeout(timeoutId);
        nostrService.unsubscribe(subId);
        resolve(null);
      }
    };

    // Set a timeout to resolve even if no events are received
    timeoutId = setTimeout(() => {
      console.log('Profile fetch timeout reached after 5000ms');
      if (!hasResolved) {
        if (events.length > 0) {
          // Process events we have so far
          processLatestEvent();
        } else {
          // No events received within timeout
          console.log('No profile events received before timeout');
          hasResolved = true;
          nostrService.unsubscribe(subId);
          resolve(null);
        }
      }
    }, 5000);
  });
}

/**
 * Updates a user's profile metadata
 *
 * @param metadata - The profile metadata to update
 * @returns Promise resolving to true if successful
 */
export async function updateUserProfile(
  metadata: ProfileMetadata
): Promise<boolean> {
  try {
    console.log('Starting profile update with metadata:', metadata);
    
    // Pre-verify NIP-05 if provided
    let isVerified = false;
    let pubkey = '';
    
    // Get the public key
    if (typeof window !== 'undefined' && window.nostr) {
      console.log('Nostr extension detected, getting public key');
      pubkey = await window.nostr.getPublicKey();
      console.log('Got public key from extension:', pubkey);
    } else {
      console.log('No Nostr extension, trying to get key from store');
      try {
        // Import the store dynamically to avoid SSR issues
        const { store } = await import('../redux/store');
        if (!store) {
          console.error('Redux store is undefined');
          throw new Error('Redux store is not available');
        }
        console.log('Store imported successfully');
        
        const currentUser = store.getState().auth.currentUser;
        console.log('Current user from store:', currentUser ? 'Found' : 'Not found');
        
        if (currentUser) {
          console.log('Current user details (initial check):', JSON.stringify({
            hasPrivateKey: !!currentUser.privateKey,
            hasPublicKey: !!currentUser.publicKey,
            publicKey: currentUser.publicKey,
            // Log other properties without exposing the actual private key
            availableProperties: Object.keys(currentUser)
          }, null, 2));
        }
        
        if (currentUser?.privateKey) {
          console.log('Private key found in store, deriving public key');
          const { getPublicKey } = require('nostr-tools');
          pubkey = getPublicKey(hexToBytes(currentUser.privateKey));
          console.log('Derived public key:', pubkey);
        } else if (currentUser?.publicKey) {
          console.log('Using public key from store');
          pubkey = currentUser.publicKey;
        } else {
          console.log('No keys found in store');
        }
      } catch (error) {
        console.error('Error accessing Redux store:', error);
      }
    }
    
    console.log('Using public key for profile update:', pubkey);
    
    // If NIP-05 is provided and we have a public key, verify it
    if (metadata.nip05 && pubkey) {
      try {
        console.log(`Pre-verifying NIP-05: ${metadata.nip05} for public key: ${pubkey}`);
        isVerified = await verifyNip05(pubkey, metadata.nip05);
        console.log(`NIP-05 verification result: ${isVerified ? 'Verified' : 'Not Verified'}`);
      } catch (verifyError) {
        console.error('Error pre-verifying NIP-05:', verifyError);
        // Continue with the update even if verification fails
      }
    }
    
    // Check if we have a Nostr extension available
    if (typeof window !== 'undefined' && window.nostr) {
      console.log('Using Nostr extension to sign and publish event');
      // Use the extension to sign and publish the event
      try {
        // Create the event
        // Convert displayName to display_name for Nostr compatibility
        const nostrMetadata: any = { ...metadata };
        if (nostrMetadata.displayName) {
          nostrMetadata.display_name = nostrMetadata.displayName;
          delete nostrMetadata.displayName;
        }
        
        console.log('Prepared metadata for Nostr event:', nostrMetadata);
        
        const event: Event = {
          kind: METADATA_KIND,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: JSON.stringify(nostrMetadata),
          pubkey: await window.nostr.getPublicKey(),
          id: '', // Will be filled in by the extension
          sig: '', // Will be filled in by the extension
        };

        console.log('Created unsigned event:', event);

        // Sign the event with the extension
        console.log('Requesting extension to sign event');
        const signedEvent = await window.nostr.signEvent(event);
        console.log('Event signed by extension:', signedEvent);
        
        // Publish the signed event
        console.log('Publishing signed event to relays');
        const publishResult = await nostrService.publishEvent(signedEvent);
        console.log('Publish result:', publishResult);
        
        try {
          // Always update the Redux store with the new profile data
          const { store } = await import('../redux/store');
          const dispatch = store.dispatch;
          const { setCurrentProfile } = require('../redux/slices/profileSlice');
          
          // Get the current profile from the store
          const currentProfile = store.getState().profile.currentProfile;
          console.log('Current profile from store:', currentProfile ? 'Found' : 'Not found');
          
          if (currentProfile) {
            console.log('Updating profile in Redux store');
            // Update the profile with the new data and verified status if applicable
            dispatch(setCurrentProfile({
              ...currentProfile,
              ...metadata,
              isVerified: metadata.nip05 ? isVerified : currentProfile.isVerified,
              lastUpdated: Math.floor(Date.now() / 1000) // Add current timestamp
            }));
            console.log('Profile updated in Redux store');
          }
        } catch (storeError) {
          console.error('Error updating Redux store:', storeError);
        }
        
        console.log('Profile update with extension successful');
        return true;
      } catch (extensionError) {
        console.error('Error using extension to sign event:', extensionError);
        console.log('Falling back to private key method');
        // Fall through to try other methods
      }
    }

    // If we don't have an extension or it failed, try to get the private key from the store
    // This would be available if the user logged in with a private key and didn't check "Remember me"
    console.log('Trying to use private key from store');
    try {
      // Import the store dynamically to avoid SSR issues
      const { store } = await import('../redux/store');
      if (!store) {
        console.error('Redux store is undefined');
        throw new Error('Redux store is not available');
      }
      console.log('Store imported successfully for private key method');
      
      const currentUser = store.getState().auth.currentUser;
      console.log('Current user from store for private key method:', currentUser ? 'Found' : 'Not found');
      
      if (currentUser) {
        console.log('Current user details:', JSON.stringify({
          hasPrivateKey: !!currentUser.privateKey,
          hasPublicKey: !!currentUser.publicKey,
          publicKey: currentUser.publicKey,
          // Log other properties without exposing the actual private key
          availableProperties: Object.keys(currentUser)
        }, null, 2));
      }
      
      if (currentUser?.privateKey) {
        console.log('Private key found in store, using it to sign event');
        // We have the private key directly in the store
        const privKey = currentUser.privateKey;
        
        // Create the event
        // Convert displayName to display_name for Nostr compatibility
        const nostrMetadata: any = { ...metadata };
        if (nostrMetadata.displayName) {
          nostrMetadata.display_name = nostrMetadata.displayName;
          delete nostrMetadata.displayName;
        }
        
        console.log('Prepared metadata for Nostr event (private key method):', nostrMetadata);
        
        const event: Event = {
          kind: METADATA_KIND,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: JSON.stringify(nostrMetadata),
          pubkey: '', // Will be filled in
          id: '', // Will be filled in
          sig: '', // Will be filled in
        };

        console.log('Created unsigned event (private key method)');

        // Get the public key from the private key
        const { getPublicKey } = require('nostr-tools');
        event.pubkey = getPublicKey(hexToBytes(privKey));
        console.log('Derived public key from private key:', event.pubkey);

        // Sign the event
        event.id = getEventHash(event);
        console.log('Generated event hash:', event.id);
        
        const { schnorr } = require('@noble/curves/secp256k1');
        const sig = schnorr.sign(event.id, privKey);
        event.sig = Buffer.from(sig).toString('hex');
        console.log('Event signed with private key');

        // Publish the event
        console.log('Publishing signed event to relays (private key method)');
        const publishResult = await nostrService.publishEvent(event);
        console.log('Publish result (private key method):', publishResult);
        
        try {
          // Always update the Redux store with the new profile data
          const dispatch = store.dispatch;
          const { setCurrentProfile } = require('../redux/slices/profileSlice');
          
          // Get the current profile from the store
          const currentProfile = store.getState().profile.currentProfile;
          console.log('Current profile from store (private key method):', currentProfile ? 'Found' : 'Not found');
          
          if (currentProfile) {
            console.log('Updating profile in Redux store (private key method)');
            // Update the profile with the new data and verified status if applicable
            dispatch(setCurrentProfile({
              ...currentProfile,
              ...metadata,
              isVerified: metadata.nip05 ? isVerified : currentProfile.isVerified,
              lastUpdated: Math.floor(Date.now() / 1000) // Add current timestamp
            }));
            console.log('Profile updated in Redux store (private key method)');
          }
        } catch (storeError) {
          console.error('Error updating Redux store (private key method):', storeError);
        }
        
        console.log('Profile update with private key successful');
        return true;
      } else if (currentUser?.encryptedPrivateKey) {
        // If we have an encrypted private key, we'll try to use it directly
        console.log('Found encrypted private key, attempting to use it directly');
        
        try {
          // Import the decrypt function
          const { decrypt } = require('../utils/encryption');
          const { retrievePrivateKey } = require('../utils/nostrKeys');
          
          // We'll use the encrypted private key directly
          // In a real implementation, we would prompt the user for their password
          // For now, we'll try to use the key that was stored during login
          
          // Create the event
          // Convert displayName to display_name for Nostr compatibility
          const nostrMetadata: any = { ...metadata };
          if (nostrMetadata.displayName) {
            nostrMetadata.display_name = nostrMetadata.displayName;
            delete nostrMetadata.displayName;
          }
          
          console.log('Prepared metadata for Nostr event (encrypted key method):', nostrMetadata);
          
          // Get the public key from the current user
          const pubkey = currentUser.publicKey;
          
          const event: Event = {
            kind: METADATA_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: JSON.stringify(nostrMetadata),
            pubkey,
            id: '', // Will be filled in
            sig: '', // Will be filled in
          };
          
          // Generate the event ID
          event.id = getEventHash(event);
          console.log('Generated event hash:', event.id);
          
          // Try to get the session password from sessionStorage
          // This is a workaround - in a real implementation, we would prompt for the password
          const sessionData = sessionStorage.getItem('xeadline_session');
          let sessionPassword = null;
          
          if (sessionData) {
            try {
              // Check if we have a password stored in the session
              const session = JSON.parse(sessionData);
              if (session.password) {
                sessionPassword = session.password;
                console.log('Found password in session');
              }
            } catch (e) {
              console.error('Error parsing session data:', e);
            }
          }
          
          // If we don't have a password, use a default one for testing
          // This is just for development and should be removed in production
          if (!sessionPassword) {
            console.log('No password in session, using default password for testing');
            sessionPassword = 'password123'; // Default password for testing
          }
          
          try {
            // Decrypt the private key
            const privateKey = await decrypt(currentUser.encryptedPrivateKey, sessionPassword);
            console.log('Successfully decrypted private key');
            
            // Sign the event
            // Import the necessary functions
            const { schnorr } = require('@noble/curves/secp256k1');
            const { bytesToHex } = require('@noble/hashes/utils');
            
            // Sign the event hash with the private key
            const sig = schnorr.sign(event.id, hexToBytes(privateKey));
            event.sig = bytesToHex(sig);
            console.log('Successfully signed event');
            
            // Publish the signed event
            console.log('Publishing signed event to relays');
            const publishResult = await nostrService.publishEvent(event);
            console.log('Publish result:', publishResult);
          } catch (decryptError) {
            console.error('Error decrypting or signing with private key:', decryptError);
            throw new Error('Unable to decrypt private key. Please try logging out and back in.');
          }
          
          try {
            // Always update the Redux store with the new profile data
            const dispatch = store.dispatch;
            const { setCurrentProfile } = require('../redux/slices/profileSlice');
            
            // Get the current profile from the store
            const currentProfile = store.getState().profile.currentProfile;
            console.log('Current profile from store (encrypted key method):', currentProfile ? 'Found' : 'Not found');
            
            if (currentProfile) {
              console.log('Updating profile in Redux store (encrypted key method)');
              // Update the profile with the new data and verified status if applicable
              dispatch(setCurrentProfile({
                ...currentProfile,
                ...metadata,
                isVerified: metadata.nip05 ? isVerified : currentProfile.isVerified,
                lastUpdated: Math.floor(Date.now() / 1000) // Add current timestamp
              }));
              console.log('Profile updated in Redux store (encrypted key method)');
            }
          } catch (storeError) {
            console.error('Error updating Redux store (encrypted key method):', storeError);
          }
          
          console.log('Profile update with encrypted key workaround successful');
          return true;
        } catch (error) {
          console.error('Error with encrypted key method:', error);
          // Fall through to try other methods
        }
      } else if (currentUser?.publicKey && typeof window !== 'undefined' && window.nostr) {
        // If we have a public key but no private key, try to use the Nostr extension again
        console.log('No private key found, but we have a public key. Trying to use Nostr extension as fallback');
        
        try {
          // Create the event
          // Convert displayName to display_name for Nostr compatibility
          const nostrMetadata: any = { ...metadata };
          if (nostrMetadata.displayName) {
            nostrMetadata.display_name = nostrMetadata.displayName;
            delete nostrMetadata.displayName;
          }
          
          console.log('Prepared metadata for Nostr event (fallback method):', nostrMetadata);
          
          const event: Event = {
            kind: METADATA_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: JSON.stringify(nostrMetadata),
            pubkey: currentUser.publicKey,
            id: '', // Will be filled in by the extension
            sig: '', // Will be filled in by the extension
          };
  
          console.log('Created unsigned event (fallback method)');
  
          // Sign the event with the extension
          console.log('Requesting extension to sign event (fallback method)');
          const signedEvent = await window.nostr.signEvent(event);
          console.log('Event signed by extension (fallback method):', signedEvent);
          
          // Publish the signed event
          console.log('Publishing signed event to relays (fallback method)');
          const publishResult = await nostrService.publishEvent(signedEvent);
          console.log('Publish result (fallback method):', publishResult);
          
          try {
            // Always update the Redux store with the new profile data
            const dispatch = store.dispatch;
            const { setCurrentProfile } = require('../redux/slices/profileSlice');
            
            // Get the current profile from the store
            const currentProfile = store.getState().profile.currentProfile;
            console.log('Current profile from store (fallback method):', currentProfile ? 'Found' : 'Not found');
            
            if (currentProfile) {
              console.log('Updating profile in Redux store (fallback method)');
              // Update the profile with the new data and verified status if applicable
              dispatch(setCurrentProfile({
                ...currentProfile,
                ...metadata,
                isVerified: metadata.nip05 ? isVerified : currentProfile.isVerified,
                lastUpdated: Math.floor(Date.now() / 1000) // Add current timestamp
              }));
              console.log('Profile updated in Redux store (fallback method)');
            }
          } catch (storeError) {
            console.error('Error updating Redux store (fallback method):', storeError);
          }
          
          console.log('Profile update with fallback method successful');
          return true;
        } catch (fallbackError) {
          console.error('Error using fallback method:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error with private key method:', error);
    }
    
    // If we got here, we couldn't sign the event
    console.error('No method available to sign the event');
    console.error('Available signing methods:');
    console.error('- Nostr extension:', typeof window !== 'undefined' && !!window.nostr);
    
    // Try to get store reference again to check available keys
    try {
      const { store: storeRef } = await import('../redux/store');
      console.error('- Private key in store:', !!storeRef?.getState()?.auth?.currentUser?.privateKey);
      console.error('- Encrypted private key in store:', !!storeRef?.getState()?.auth?.currentUser?.encryptedPrivateKey);
      console.error('- Public key in store:', !!storeRef?.getState()?.auth?.currentUser?.publicKey);
    } catch (e) {
      console.error('- Could not check store for keys:', e);
    }
    
    // Check if we have an encrypted private key
    try {
      const { store: storeRef } = await import('../redux/store');
      if (storeRef?.getState()?.auth?.currentUser?.encryptedPrivateKey) {
        throw new Error('Unable to sign profile update. Please log out and log back in with the "Remember me" option checked.');
      }
    } catch (e) {
      // If we can't check, just use the generic message
    }
    
    throw new Error('Unable to sign profile update. Please try logging out and back in.');
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

/**
 * Fetches a user's activity feed (posts and reactions)
 * 
 * @param publicKey - The public key of the user
 * @param limit - Maximum number of events to fetch
 * @returns Promise resolving to the user's activity events
 */
export async function fetchUserActivity(publicKey: string, limit: number = 20): Promise<Event[]> {
  return new Promise((resolve) => {
    const events: Event[] = [];
    let hasResolved = false;

    // Subscribe to text notes and reactions from this user
    const subId = `activity-${publicKey}-${Date.now()}`;
    
    nostrService.subscribe(
      subId,
      [{ kinds: [TEXT_NOTE_KIND, REACTION_KIND], authors: [publicKey], limit }],
      (event) => {
        events.push(event);
      },
      () => {
        // On EOSE (End of Stored Events)
        if (!hasResolved) {
          hasResolved = true;
          nostrService.unsubscribe(subId);
          
          // Sort events by timestamp (newest first)
          events.sort((a, b) => b.created_at - a.created_at);
          
          resolve(events);
        }
      }
    );

    // Set a timeout to resolve even if no events are received
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        nostrService.unsubscribe(subId);
        
        // Sort events by timestamp (newest first)
        events.sort((a, b) => b.created_at - a.created_at);
        
        resolve(events);
      }
    }, 5000);
  });
}

/**
 * Uploads an image to a hosting service and returns the URL
 * 
 * @param file - The image file to upload
 * @returns Promise resolving to the image URL
 */
export async function uploadProfileImage(file: File): Promise<string> {
  // In a real implementation, this would upload to an image hosting service
  // For this MVP, we'll use a mock implementation that returns a data URL
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}