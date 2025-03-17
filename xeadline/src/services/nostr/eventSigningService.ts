import { Event, getEventHash, nip19 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';
import { retrievePrivateKey, getExtensionPublicKey, checkExtensionAvailability } from '../../utils/nostrKeys';

// Types
export interface UnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
}

export interface SigningResult {
  success: boolean;
  event?: Event;
  error?: string;
  needsPassword?: boolean;
}

export interface SigningOptions {
  privateKey?: string;
  password?: string;
  retryCount?: number;
  timeout?: number;
}

// Maximum number of retries
const MAX_RETRIES = 3;
// Default timeout for extension signing (in milliseconds)
const DEFAULT_EXTENSION_TIMEOUT = 15000;

/**
 * Ensures that the Nostr extension is properly initialized
 *
 * @returns A promise that resolves to true if the extension is initialized, false otherwise
 */
async function ensureExtensionInitialized(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.nostr) {
    console.log('ensureExtensionInitialized: No window.nostr object available');
    return false;
  }
  
  try {
    // Check if the extension is available
    const isAvailable = await checkExtensionAvailability();
    if (!isAvailable) {
      console.log('ensureExtensionInitialized: Extension is not available');
      return false;
    }
    
    // Check if the extension has the required methods
    if (!window.nostr.getPublicKey || !window.nostr.signEvent) {
      console.log('ensureExtensionInitialized: Extension is missing required methods');
      return false;
    }
    
    // Try to get the public key to verify the extension is working
    const publicKey = await window.nostr.getPublicKey();
    if (!publicKey) {
      console.log('ensureExtensionInitialized: Failed to get public key from extension');
      return false;
    }
    
    console.log('ensureExtensionInitialized: Extension is properly initialized with public key', publicKey);
    return true;
  } catch (error) {
    console.error('ensureExtensionInitialized: Error initializing extension', error);
    return false;
  }
}

/**
 * Sign a Nostr event using the available signing method
 * 
 * @param unsignedEvent The event to sign
 * @param options Signing options
 * @returns A promise that resolves to the signing result
 */
export async function signEvent(
  unsignedEvent: UnsignedEvent,
  options: SigningOptions = {}
): Promise<SigningResult> {
  const { privateKey, password, retryCount = 0, timeout = DEFAULT_EXTENSION_TIMEOUT } = options;
  
  try {
    console.log('eventSigningService: Attempting to sign event', {
      eventKind: unsignedEvent.kind,
      hasPrivateKey: !!privateKey,
      hasPassword: !!password,
      retryCount,
      isExtensionAvailable: typeof window !== 'undefined' && !!window.nostr
    });
    
    // Try to sign with Nostr extension
    const isExtensionInitialized = await ensureExtensionInitialized();
    
    if (isExtensionInitialized) {
      try {
        console.log('eventSigningService: Extension is initialized, attempting to sign with it');
        
        // Get the public key from the extension
        const extensionPubkey = await getExtensionPublicKey();
        
        if (!extensionPubkey) {
          console.error('eventSigningService: Failed to get public key from extension');
          throw new Error('Failed to get public key from extension');
        }
        
        console.log('eventSigningService: Got public key from extension', {
          extensionPubkey,
          originalPubkey: unsignedEvent.pubkey
        });
        
        // Create a properly formatted event for the extension
        // NIP-07 compliant extensions expect this format
        const eventToSign = {
          kind: unsignedEvent.kind,
          created_at: unsignedEvent.created_at,
          tags: unsignedEvent.tags,
          content: unsignedEvent.content,
          pubkey: extensionPubkey
        };
        
        console.log('eventSigningService: Sending event to extension for signing', eventToSign);
        
        // Sign the event with timeout
        const signedEvent = await Promise.race([
          window.nostr!.signEvent(eventToSign),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Extension signing timed out')), timeout)
          )
        ]);
        
        console.log('eventSigningService: Received signed event from extension', signedEvent);
        
        // Verify that the signed event has all required fields
        if (!signedEvent || !signedEvent.id || !signedEvent.sig) {
          console.error('eventSigningService: Invalid signed event from extension', signedEvent);
          throw new Error('Invalid signed event from extension');
        }
        
        console.log('eventSigningService: Successfully signed with extension');
        
        return {
          success: true,
          event: signedEvent
        };
      } catch (extensionError) {
        console.error('eventSigningService: Error signing with extension:', extensionError);
        // Fall through to try other methods
      }
    } else {
      console.log('eventSigningService: Extension is not available, skipping extension signing');
    }
    
    // Try to sign with provided private key
    if (privateKey) {
      try {
        console.log('eventSigningService: Attempting to sign with provided private key');
        
        // Create a copy of the event
        const event: Event = {
          ...unsignedEvent,
          id: '',
          sig: ''
        };
        
        // Generate the event ID
        event.id = getEventHash(event);
        
        // Sign the event
        const privateKeyBytes = hexToBytes(privateKey);
        const sig = schnorr.sign(event.id, privateKeyBytes);
        event.sig = Buffer.from(sig).toString('hex');
        
        console.log('eventSigningService: Successfully signed with private key');
        
        return {
          success: true,
          event
        };
      } catch (privateKeyError) {
        console.error('eventSigningService: Error signing with private key:', privateKeyError);
        return {
          success: false,
          error: 'Failed to sign with private key: ' + (privateKeyError instanceof Error ? privateKeyError.message : String(privateKeyError))
        };
      }
    }
    
    // Try to decrypt and use stored private key
    if (password) {
      try {
        console.log('eventSigningService: Attempting to decrypt private key with password');
        
        const decryptedKey = await retrievePrivateKey(password);
        
        if (!decryptedKey) {
          console.error('eventSigningService: Invalid password or no encrypted key found');
          return {
            success: false,
            error: 'Invalid password or no encrypted key found'
          };
        }
        
        console.log('eventSigningService: Successfully decrypted private key, attempting to sign');
        
        // Recursively call signEvent with the decrypted key
        return signEvent(unsignedEvent, {
          ...options,
          privateKey: decryptedKey,
          password: undefined
        });
      } catch (decryptionError) {
        console.error('eventSigningService: Error decrypting private key:', decryptionError);
        return {
          success: false,
          error: 'Failed to decrypt private key: ' + (decryptionError instanceof Error ? decryptionError.message : String(decryptionError))
        };
      }
    }
    
    // If we've exhausted all options, indicate that a password is needed
    console.log('eventSigningService: No signing method available, password required');
    return {
      success: false,
      needsPassword: true,
      error: 'Password required to decrypt private key'
    };
  } catch (error) {
    console.error('eventSigningService: Unexpected error in signEvent:', error);
    
    // Retry if we haven't exceeded the maximum retries
    if (retryCount < MAX_RETRIES) {
      console.log(`eventSigningService: Retrying event signing (${retryCount + 1}/${MAX_RETRIES})...`);
      return signEvent(unsignedEvent, {
        ...options,
        retryCount: retryCount + 1
      });
    }
    
    return {
      success: false,
      error: `Failed to sign event after ${MAX_RETRIES} attempts: ` + (error instanceof Error ? error.message : String(error))
    };
  }
}