/**
 * Legacy Adapter for the Event Management System
 * 
 * This adapter provides backward compatibility with the existing code by
 * exposing the same API as the old event signing and publishing functions.
 */

import { EventManager } from '../EventManager';
import { UnsignedEvent, Event, SigningOptions, PublishOptions } from '../types';
import { signEvent as oldSignEvent } from '../../nostr/eventSigningService';
import nostrService from '../../nostr/nostrService';

/**
 * Adapter to provide backward compatibility with existing code
 */
export class LegacyAdapter {
  private eventManager: EventManager;
  
  /**
   * Creates a new LegacyAdapter
   * 
   * @param eventManager The EventManager to adapt
   */
  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
  }
  
  /**
   * Adapter for the old signEvent function
   * 
   * @param unsignedEvent The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async signEvent(
    unsignedEvent: UnsignedEvent,
    options?: SigningOptions
  ): Promise<any> {
    console.log('LegacyAdapter: Adapting signEvent call');
    
    // Map to new format
    const result = await this.eventManager.signEvent(unsignedEvent, options);
    
    // Map back to old format
    return {
      success: result.success,
      event: result.event,
      error: result.error,
      needsPassword: result.needsPassword
    };
  }
  
  /**
   * Adapter for the old publishEvent function
   * 
   * @param event The event to publish
   * @returns A promise that resolves to an array of relay URLs
   */
  async publishEvent(event: Event): Promise<string[]> {
    console.log('LegacyAdapter: Adapting publishEvent call');
    
    // Map to new format
    const result = await this.eventManager.publishEvent(event);
    
    // Map back to old format
    return result.publishedTo;
  }
}

/**
 * Create drop-in replacements for existing functions
 * 
 * @param eventManager The EventManager to use
 * @returns An object with the legacy functions
 */
export function createLegacyFunctions(eventManager: EventManager): {
  signEvent: typeof oldSignEvent;
  publishEvent: typeof nostrService.publishEvent;
} {
  const adapter = new LegacyAdapter(eventManager);
  
  return {
    signEvent: adapter.signEvent.bind(adapter),
    publishEvent: adapter.publishEvent.bind(adapter)
  };
}