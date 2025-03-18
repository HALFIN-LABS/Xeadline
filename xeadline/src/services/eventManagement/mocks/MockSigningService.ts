/**
 * Mock Signing Service for testing
 * 
 * This is a simplified version of the SigningService that always succeeds
 * without requiring external dependencies like browser extensions or private keys.
 */

import { UnsignedEvent, Event, SigningResult, SigningOptions } from '../types';
import { getEventHash } from 'nostr-tools';

/**
 * Mock implementation of the SigningService
 */
export class MockSigningService {
  /**
   * Signs an event using a mock signature
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async sign(event: UnsignedEvent, options: SigningOptions = {}): Promise<SigningResult> {
    console.log('MockSigningService: Signing event', {
      eventKind: event.kind,
      contentLength: event.content.length
    });
    
    // Create a copy of the event
    const signedEvent: Event = {
      ...event,
      id: '',
      sig: ''
    };
    
    // Generate the event ID
    signedEvent.id = getEventHash(signedEvent);
    
    // Generate a mock signature (64 bytes of 'a')
    signedEvent.sig = 'a'.repeat(128);
    
    console.log('MockSigningService: Successfully signed event', {
      id: signedEvent.id,
      sig: signedEvent.sig.substring(0, 10) + '...'
    });
    
    return {
      success: true,
      event: signedEvent
    };
  }
  
  /**
   * Gets a mock public key
   * 
   * @returns A promise that resolves to the public key
   */
  async getPublicKey(): Promise<string> {
    // Return a mock public key (32 bytes of 'a')
    return 'a'.repeat(64);
  }
}