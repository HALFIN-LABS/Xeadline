/**
 * Signing Service for the Event Management System
 * 
 * This service handles the signing of Nostr events using various methods
 * including browser extensions, private keys, and encrypted keys.
 */

import { UnsignedEvent, Event, SigningResult, SigningOptions, SigningMethod } from './types';
import { SigningFailedError } from './errors';
import { MAX_SIGNING_RETRIES, DEFAULT_SIGNING_TIMEOUT } from './constants';
import { getEventHash } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';
import { retrievePrivateKey, getExtensionPublicKey, checkExtensionAvailability } from '../../utils/nostrKeys';

/**
 * Service for signing Nostr events
 */
export class SigningService {
  private methods: SigningMethod[] = [];
  
  /**
   * Creates a new SigningService with default signing methods
   */
  constructor() {
    // Register default signing methods
    this.registerSigningMethod(new ExtensionSigningMethod());
    this.registerSigningMethod(new PrivateKeySigningMethod());
    this.registerSigningMethod(new EncryptedKeySigningMethod());
  }
  
  /**
   * Registers a new signing method
   * 
   * @param method The signing method to register
   */
  registerSigningMethod(method: SigningMethod): void {
    this.methods.push(method);
  }
  
  /**
   * Signs an event using the available signing methods
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    const { retryCount = 0, timeout = DEFAULT_SIGNING_TIMEOUT } = options;
    
    try {
      console.log('SigningService: Attempting to sign event', {
        eventKind: event.kind,
        hasPrivateKey: !!options.privateKey,
        hasPassword: !!options.password,
        retryCount,
        isExtensionAvailable: typeof window !== 'undefined' && !!window.nostr
      });
      
      // Try each signing method in order
      for (const method of this.methods) {
        if (await method.canSign(event, options)) {
          console.log('SigningService: Found a signing method that can sign the event');
          return await method.sign(event, { ...options, timeout });
        }
      }
      
      // If we get here, no method could sign
      console.log('SigningService: No signing method could sign the event');
      if (options.password) {
        return {
          success: false,
          error: 'Invalid password or no encrypted key found'
        };
      } else {
        return {
          success: false,
          needsPassword: true,
          error: 'Password required to decrypt private key'
        };
      }
    } catch (error) {
      console.error('Error in SigningService:', error);
      
      // Retry if we haven't exceeded the maximum retries
      if (retryCount < MAX_SIGNING_RETRIES) {
        console.log(`Retrying event signing (${retryCount + 1}/${MAX_SIGNING_RETRIES})...`);
        return this.sign(event, {
          ...options,
          retryCount: retryCount + 1
        });
      }
      
      return {
        success: false,
        error: `Failed to sign event after ${MAX_SIGNING_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Gets the public key using the available methods
   * 
   * @returns A promise that resolves to the public key
   * @throws SigningFailedError if no method is available to get the public key
   */
  async getPublicKey(): Promise<string> {
    // Try to get from extension first
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        const publicKey = await Promise.race([
          window.nostr.getPublicKey(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Extension getPublicKey timed out')), 5000)
          )
        ]);
        
        if (publicKey) {
          return publicKey;
        }
      } catch (error) {
        console.warn('Failed to get public key from extension:', error);
      }
    }
    
    // Fallback to other methods
    // This would need to be implemented based on your authentication system
    throw new SigningFailedError('No method available to get public key');
  }
}

/**
 * Signing method that uses a Nostr browser extension
 */
class ExtensionSigningMethod implements SigningMethod {
  /**
   * Checks if this method can sign the event
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to true if this method can sign the event
   */
  async canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean> {
    if (typeof window === 'undefined' || !window.nostr) {
      return false;
    }
    
    try {
      // Check if the extension has the required methods
      if (!window.nostr.getPublicKey || !window.nostr.signEvent) {
        return false;
      }
      
      // Try to get the public key to verify the extension is working
      const publicKey = await Promise.race([
        window.nostr.getPublicKey(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Extension getPublicKey timed out')), 5000)
        )
      ]);
      
      return !!publicKey;
    } catch (error) {
      console.warn('Extension signing method not available:', error);
      return false;
    }
  }
  
  /**
   * Signs the event using a Nostr browser extension
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    const timeout = options.timeout || DEFAULT_SIGNING_TIMEOUT;
    
    try {
      // Get the public key from the extension
      const extensionPubkey = await Promise.race([
        window.nostr!.getPublicKey(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Getting public key from extension timed out')), 5000)
        )
      ]);
      
      if (!extensionPubkey) {
        throw new SigningFailedError('Failed to get public key from extension');
      }
      
      // Create a properly formatted event for the extension
      const eventToSign = {
        kind: event.kind,
        created_at: event.created_at,
        tags: event.tags,
        content: event.content,
        pubkey: extensionPubkey
      };
      
      // Sign the event with timeout
      const signedEvent = await Promise.race([
        window.nostr!.signEvent(eventToSign),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Extension signing timed out')), timeout)
        )
      ]);
      
      // Verify that the signed event has all required fields
      if (!signedEvent || !signedEvent.id || !signedEvent.sig) {
        throw new SigningFailedError('Invalid signed event from extension');
      }
      
      return {
        success: true,
        event: signedEvent
      };
    } catch (error) {
      throw new SigningFailedError(`Extension signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Signing method that uses a private key
 */
class PrivateKeySigningMethod implements SigningMethod {
  /**
   * Checks if this method can sign the event
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to true if this method can sign the event
   */
  async canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean> {
    return !!options?.privateKey;
  }
  
  /**
   * Signs the event using a private key
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    if (!options.privateKey) {
      return {
        success: false,
        error: 'No private key provided'
      };
    }
    
    try {
      // Create a copy of the event
      const signedEvent: Event = {
        ...event,
        id: '',
        sig: ''
      };
      
      // Generate the event ID
      signedEvent.id = getEventHash(signedEvent);
      
      // Sign the event
      const privateKeyBytes = hexToBytes(options.privateKey);
      const sig = schnorr.sign(signedEvent.id, privateKeyBytes);
      signedEvent.sig = Buffer.from(sig).toString('hex');
      
      return {
        success: true,
        event: signedEvent
      };
    } catch (error) {
      throw new SigningFailedError(`Private key signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Signing method that uses an encrypted private key
 */
class EncryptedKeySigningMethod implements SigningMethod {
  /**
   * Checks if this method can sign the event
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to true if this method can sign the event
   */
  async canSign(event: UnsignedEvent, options?: SigningOptions): Promise<boolean> {
    return !!options?.password;
  }
  
  /**
   * Signs the event using an encrypted private key
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    if (!options.password) {
      return {
        success: false,
        needsPassword: true,
        error: 'Password required to decrypt private key'
      };
    }
    
    try {
      // Decrypt the private key
      const decryptedKey = await retrievePrivateKey(options.password);
      
      if (!decryptedKey) {
        return {
          success: false,
          error: 'Invalid password or no encrypted key found'
        };
      }
      
      // Use the PrivateKeySigningMethod to sign with the decrypted key
      const privateKeyMethod = new PrivateKeySigningMethod();
      return privateKeyMethod.sign(event, {
        ...options,
        privateKey: decryptedKey
      });
    } catch (error) {
      throw new SigningFailedError(`Encrypted key signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}