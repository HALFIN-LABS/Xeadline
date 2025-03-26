/**
 * Authentication Service
 * 
 * This service handles authentication operations including:
 * - Login with private key
 * - Login with extension
 * - Key generation
 * - Session management
 */

import { 
  generateKeyPair, 
  validatePrivateKey, 
  checkExtensionAvailability,
  getExtensionPublicKey,
  storeEncryptedPrivateKey,
  retrievePrivateKey,
  retrievePublicKey,
  clearStoredKeys
} from '../utils/nostrKeys';

import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setExtensionAvailable,
  setKeyJustGenerated,
  NostrKey
} from '../redux/slices/authSlice';

import { AppDispatch } from '../redux/store';

// Session storage key
const SESSION_KEY = 'xeadline_session';
// Use localStorage instead of sessionStorage to persist across refreshes
const useLocalStorage = true;

/**
 * Initializes the authentication state
 * Checks for existing session and extension availability
 *
 * @param dispatch - Redux dispatch function
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeAuth(dispatch: AppDispatch): Promise<void> {
  console.log('AuthService: Starting authentication initialization');
  
  try {
    // Check for Nostr extension
    const hasExtension = await checkExtensionAvailability();
    dispatch(setExtensionAvailable(hasExtension));
    console.log('AuthService: Extension availability checked:', hasExtension);
    
    // Check for existing session
    const session = useLocalStorage
      ? localStorage.getItem(SESSION_KEY)
      : sessionStorage.getItem(SESSION_KEY);
    
    if (session) {
      console.log('AuthService: Found existing session');
      try {
        const sessionData = JSON.parse(session);
        
        // If using extension
        if (sessionData.useExtension) {
          console.log('AuthService: Session uses extension');
          if (hasExtension) {
            try {
              const publicKey = await getExtensionPublicKey();
              if (publicKey) {
                console.log('AuthService: Successfully retrieved public key from extension');
                dispatch(loginSuccess({ publicKey }));
              } else {
                console.log('AuthService: Extension no longer has the key');
                clearSession();
              }
            } catch (extensionError) {
              console.error('AuthService: Error getting public key from extension:', extensionError);
              clearSession();
            }
          } else {
            console.log('AuthService: Extension no longer available');
            clearSession();
          }
        }
        // If using stored key
        else if (sessionData.hasStoredKey) {
          console.log('AuthService: Session uses stored key');
          const publicKey = retrievePublicKey();
          if (publicKey) {
            console.log('AuthService: Successfully retrieved stored public key');
            dispatch(loginSuccess({
              publicKey,
              encryptedPrivateKey: localStorage.getItem('xeadline_encrypted_private_key') || undefined
            }));
          } else {
            console.log('AuthService: Stored key no longer available');
            clearSession();
          }
        }
      } catch (error) {
        console.error('AuthService: Invalid session data:', error);
        clearSession();
      }
    } else {
      console.log('AuthService: No existing session found');
    }
    
    console.log('AuthService: Authentication initialization completed');
  } catch (error) {
    console.error('AuthService: Unexpected error during auth initialization:', error);
    // Even on error, we consider initialization complete
  }
}

/**
 * Logs in with a private key
 * 
 * @param privateKey - The private key (hex or nsec format)
 * @param password - Password for encrypting the key
 * @param rememberMe - Whether to store the encrypted key
 * @param dispatch - Redux dispatch function
 */
export async function loginWithPrivateKey(
  privateKey: string,
  password: string,
  rememberMe: boolean,
  dispatch: AppDispatch
) {
  dispatch(loginStart());
  
  try {
    // Validate and normalize the private key
    const normalizedKey = validatePrivateKey(privateKey);
    if (!normalizedKey) {
      dispatch(loginFailure('Invalid private key format'));
      return;
    }
    
    // Store the key if remember me is enabled
    if (rememberMe) {
      await storeEncryptedPrivateKey(normalizedKey, password);
      
      // Create session with password
      createSession({ hasStoredKey: true, useExtension: false }, password);
      
      dispatch(loginSuccess({
        publicKey: retrievePublicKey()!,
        encryptedPrivateKey: localStorage.getItem('xeadline_encrypted_private_key') || undefined
      }));
    } else {
      // Don't store the key, but keep it in memory for the session
      // Use hexToBytes and getPublicKey to derive the public key from the private key
      const { hexToBytes } = require('@noble/hashes/utils');
      const { getPublicKey } = require('nostr-tools');
      const publicKey = getPublicKey(hexToBytes(normalizedKey));
      
      // Create session
      createSession({ hasStoredKey: false, useExtension: false });
      
      console.log('Storing private key in memory for session', {
        publicKey,
        privateKeyLength: normalizedKey.length,
        privateKeyType: typeof normalizedKey,
        privateKeyStart: normalizedKey.substring(0, 4) + '...'
      });
      
      dispatch(loginSuccess({
        publicKey,
        privateKey: normalizedKey
      }));
    }
  } catch (error) {
    dispatch(loginFailure('Login failed: ' + (error instanceof Error ? error.message : String(error))));
  }
}

/**
 * Logs in with a stored encrypted key
 * 
 * @param password - Password for decrypting the key
 * @param dispatch - Redux dispatch function
 */
export async function loginWithStoredKey(
  password: string,
  dispatch: AppDispatch
) {
  dispatch(loginStart());
  
  try {
    const privateKey = await retrievePrivateKey(password);
    if (!privateKey) {
      dispatch(loginFailure('Invalid password or no stored key found'));
      return;
    }
    
    // Create session with password
    createSession({ hasStoredKey: true, useExtension: false }, password);
    
    dispatch(loginSuccess({
      publicKey: retrievePublicKey()!,
      encryptedPrivateKey: localStorage.getItem('xeadline_encrypted_private_key') || undefined
    }));
  } catch (error) {
    dispatch(loginFailure('Login failed: ' + (error instanceof Error ? error.message : String(error))));
  }
}

/**
 * Logs in with a Nostr extension
 * 
 * @param dispatch - Redux dispatch function
 */
export async function loginWithExtension(dispatch: AppDispatch) {
  dispatch(loginStart());
  
  try {
    const hasExtension = await checkExtensionAvailability();
    if (!hasExtension) {
      dispatch(loginFailure('No Nostr extension found'));
      return;
    }
    
    const publicKey = await getExtensionPublicKey();
    if (!publicKey) {
      dispatch(loginFailure('Failed to get public key from extension'));
      return;
    }
    
    // Create session
    createSession({ hasStoredKey: false, useExtension: true });
    
    dispatch(loginSuccess({ publicKey }));
  } catch (error) {
    dispatch(loginFailure('Extension login failed: ' + (error instanceof Error ? error.message : String(error))));
  }
}

/**
 * Generates a new key pair and logs in
 * 
 * @param password - Password for encrypting the key
 * @param dispatch - Redux dispatch function
 */
export async function generateKeyAndLogin(
  password: string,
  dispatch: AppDispatch
) {
  dispatch(loginStart());
  
  try {
    // Generate a new key pair
    const { privateKey, publicKey } = generateKeyPair();
    
    // Store the encrypted key
    await storeEncryptedPrivateKey(privateKey, password);
    
    // Create session with password
    createSession({ hasStoredKey: true, useExtension: false }, password);
    
    // Set the keyJustGenerated flag to true
    dispatch(setKeyJustGenerated(true));
    
    dispatch(loginSuccess({
      publicKey,
      encryptedPrivateKey: localStorage.getItem('xeadline_encrypted_private_key') || undefined
    }));
  } catch (error) {
    dispatch(loginFailure('Key generation failed: ' + (error instanceof Error ? error.message : String(error))));
  }
}

/**
 * Logs out the current user
 *
 * @param dispatch - Redux dispatch function
 * @param clearKeys - Whether to clear stored keys (defaults to true for security)
 */
export function logoutUser(dispatch: AppDispatch, clearKeys: boolean = true) {
  // Clear session
  clearSession();
  
  // Clear stored keys if requested (default is true)
  if (clearKeys) {
    clearStoredKeys();
  }
  
  // Dispatch logout action to update Redux state
  dispatch(logout());
  
  console.log('User logged out successfully');
}

/**
 * Creates a session in sessionStorage
 *
 * @param data - Session data
 * @param password - Optional password to store in the session
 */
function createSession(
  data: { hasStoredKey: boolean, useExtension: boolean },
  password?: string
) {
  const sessionData = {
    ...data,
    password: password || undefined
  };
  
  if (useLocalStorage) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }
}

/**
 * Clears the session from storage
 */
function clearSession() {
  if (useLocalStorage) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}