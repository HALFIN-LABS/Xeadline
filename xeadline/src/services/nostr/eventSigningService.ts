import { Event, getEventHash } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';
import { retrievePrivateKey } from '../../utils/nostrKeys';

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
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        console.log('eventSigningService: Attempting to sign with extension');
        
        // Set the pubkey from the extension
        unsignedEvent.pubkey = await window.nostr.getPublicKey();
        
        // Sign the event with timeout
        const signedEvent = await Promise.race([
          window.nostr.signEvent(unsignedEvent),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Extension signing timed out')), timeout)
          )
        ]);
        
        console.log('eventSigningService: Successfully signed with extension');
        
        return {
          success: true,
          event: signedEvent
        };
      } catch (extensionError) {
        console.error('eventSigningService: Error signing with extension:', extensionError);
        // Fall through to try other methods
      }
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