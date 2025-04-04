/**
 * Nostr key utilities
 *
 * This module provides functions for generating, validating, and managing Nostr keys.
 * It supports both direct key generation and interaction with Nostr browser extensions.
 */

import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import { encrypt, decrypt } from './encryption'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

// Local storage keys
const ENCRYPTED_PRIVATE_KEY = 'xeadline_encrypted_private_key'
const PUBLIC_KEY = 'xeadline_public_key'

/**
 * Generates a new Nostr key pair
 *
 * @returns An object containing the private and public keys
 */
export function generateKeyPair() {
  const privateKeyBytes = generateSecretKey()
  const privateKey = bytesToHex(privateKeyBytes)
  const publicKey = getPublicKey(privateKeyBytes)
  
  return { privateKey, publicKey }
}

/**
 * Validates a Nostr private key (nsec or hex)
 * 
 * @param key - The private key to validate
 * @returns The normalized hex private key if valid, null otherwise
 */
export function validatePrivateKey(key: string): string | null {
  try {
    // Handle nsec format
    if (key.startsWith('nsec')) {
      try {
        // Decode the nsec using nip19
        const { data } = nip19.decode(key);
        return bytesToHex(data as Uint8Array);
      } catch (error) {
        console.error('Error decoding nsec:', error);
        return null;
      }
    }
    
    // Handle hex format (64 characters)
    if (/^[0-9a-f]{64}$/i.test(key)) {
      return key.toLowerCase()
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Checks if a Nostr extension (like nos2x) is available in the browser
 * 
 * @returns A promise that resolves to true if an extension is available
 */
export async function checkExtensionAvailability(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  try {
    // Check if window.nostr exists (standard Nostr extension API)
    if (window.nostr) {
      // Try to get the public key to verify the extension is working
      const publicKey = await window.nostr.getPublicKey()
      return !!publicKey
    }
    return false
  } catch (error) {
    return false
  }
}

/**
 * Gets the public key from a Nostr extension
 *
 * @param retries - Number of retry attempts (default: 3)
 * @param delay - Delay between retries in ms (default: 100)
 * @returns A promise that resolves to the public key if available
 */
export async function getExtensionPublicKey(retries = 3, delay = 100): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  try {
    if (window.nostr) {
      try {
        return await window.nostr.getPublicKey()
      } catch (error) {
        // If we have retries left, wait and try again
        if (retries > 0) {
          console.log(`Retrying getPublicKey (${retries} attempts left)...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return getExtensionPublicKey(retries - 1, delay)
        }
        console.error('Failed to get public key after multiple attempts:', error)
        return null
      }
    }
    return null
  } catch (error) {
    console.error('Error accessing window.nostr:', error)
    return null
  }
}

/**
 * Stores an encrypted private key in local storage
 * 
 * @param privateKey - The private key to store
 * @param password - The password to encrypt with
 */
export async function storeEncryptedPrivateKey(
  privateKey: string,
  password: string
): Promise<void> {
  const encryptedKey = await encrypt(privateKey, password)
  localStorage.setItem(ENCRYPTED_PRIVATE_KEY, encryptedKey)
  
  // Also store the public key for convenience
  const publicKey = getPublicKey(hexToBytes(privateKey))
  localStorage.setItem(PUBLIC_KEY, publicKey)
}

/**
 * Retrieves and decrypts a private key from local storage
 * 
 * @param password - The password to decrypt with
 * @returns The decrypted private key if successful
 */
export async function retrievePrivateKey(password: string): Promise<string | null> {
  const encryptedKey = localStorage.getItem(ENCRYPTED_PRIVATE_KEY)
  if (!encryptedKey) return null
  
  try {
    return await decrypt(encryptedKey, password)
  } catch (error) {
    return null
  }
}

/**
 * Retrieves the stored public key from local storage
 * 
 * @returns The public key if available
 */
export function retrievePublicKey(): string | null {
  return localStorage.getItem(PUBLIC_KEY)
}

/**
 * Clears stored keys and all related user data from local storage and session storage
 */
export function clearStoredKeys(): void {
  // Clear specific key-related items
  localStorage.removeItem(ENCRYPTED_PRIVATE_KEY)
  localStorage.removeItem(PUBLIC_KEY)
  
  // Clear session storage
  sessionStorage.removeItem('xeadline_session')
  
  // Clear any other potential user-related data
  // This ensures we don't leave any user data behind
  localStorage.removeItem('xeadline_user_preferences')
  localStorage.removeItem('xeadline_theme')
  
  // Clear any cached profile data
  localStorage.removeItem('xeadline_profile_cache')
  
  console.log('All stored keys and user data cleared')
}

// Add TypeScript declaration for window.nostr
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(event: {
        kind: number;
        created_at: number;
        tags: string[][];
        content: string;
        pubkey: string;
      }): Promise<{
        id: string;
        pubkey: string;
        created_at: number;
        kind: number;
        tags: string[][];
        content: string;
        sig: string;
      }>
    }
  }
}