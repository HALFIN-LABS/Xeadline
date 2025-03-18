/**
 * Publishing Service for the Event Management System
 * 
 * This service handles the publishing of signed Nostr events to relays
 * with retry logic and error handling.
 */

import { Event, PublishResult, PublishOptions } from './types';
import { PublishingFailedError } from './errors';
import { 
  MAX_PUBLISHING_RETRIES, 
  DEFAULT_PUBLISHING_TIMEOUT, 
  RETRY_BACKOFF_FACTOR,
  DEFAULT_RELAYS
} from './constants';
import nostrService from '../nostr/nostrService';

/**
 * Service for publishing Nostr events to relays
 */
export class PublishingService {
  private publishHistory: Map<string, { 
    event: Event, 
    result: PublishResult, 
    timestamp: number 
  }> = new Map();
  
  /**
   * Publishes an event to relays
   * 
   * @param event The event to publish
   * @param options Publishing options
   * @returns A promise that resolves to the publish result
   */
  async publish(event: Event, options: PublishOptions = {}): Promise<PublishResult> {
    const { 
      relays = nostrService.getRelays(), 
      timeout = DEFAULT_PUBLISHING_TIMEOUT,
      retries = MAX_PUBLISHING_RETRIES 
    } = options;
    
    console.log('PublishingService: Publishing event', {
      eventId: event.id,
      eventKind: event.kind,
      relayCount: relays.length,
      timeout,
      retries
    });
    
    let publishedTo: string[] = [];
    let retryCount = 0;
    let lastError: Error | null = null;
    
    // Try to publish with retries
    while (retryCount <= retries) {
      try {
        // Calculate timeout with exponential backoff
        const currentTimeout = timeout * Math.pow(RETRY_BACKOFF_FACTOR, retryCount);
        
        console.log(`PublishingService: Attempt ${retryCount + 1}/${retries + 1} with timeout ${currentTimeout}ms`);
        
        // Set timeout for publishing
        const publishPromise = nostrService.publishEvent(event);
        const timeoutPromise = new Promise<string[]>((_, reject) => {
          setTimeout(() => reject(new Error('Publishing timed out')), currentTimeout);
        });
        
        // Publish with timeout
        publishedTo = await Promise.race([publishPromise, timeoutPromise]);
        
        // If published to at least one relay, consider it a success
        if (publishedTo.length > 0) {
          console.log(`PublishingService: Successfully published to ${publishedTo.length} relays`);
          break;
        }
        
        // If not published to any relays, retry
        lastError = new PublishingFailedError('Failed to publish to any relays');
        console.warn(`PublishingService: ${lastError.message}, retrying...`);
        retryCount++;
        
        // Wait before retrying (exponential backoff)
        if (retryCount <= retries) {
          const backoffTime = 1000 * Math.pow(RETRY_BACKOFF_FACTOR, retryCount - 1);
          console.log(`PublishingService: Waiting ${backoffTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`PublishingService: Error publishing event: ${lastError.message}`);
        retryCount++;
        
        // Wait before retrying (exponential backoff)
        if (retryCount <= retries) {
          const backoffTime = 1000 * Math.pow(RETRY_BACKOFF_FACTOR, retryCount - 1);
          console.log(`PublishingService: Waiting ${backoffTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // Create result
    const result: PublishResult = {
      success: publishedTo.length > 0,
      publishedTo,
      error: publishedTo.length === 0 && lastError ? lastError.message : undefined
    };
    
    // Store in history
    this.publishHistory.set(event.id, {
      event,
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  /**
   * Gets the publish status for an event
   * 
   * @param eventId The ID of the event
   * @returns The publish result, or null if not found
   */
  async getPublishStatus(eventId: string): Promise<PublishResult | null> {
    const history = this.publishHistory.get(eventId);
    if (!history) {
      return null;
    }
    
    return history.result;
  }
  
  /**
   * Retries publishing an event
   * 
   * @param eventId The ID of the event to retry
   * @param options Publishing options
   * @returns A promise that resolves to the publish result
   * @throws PublishingFailedError if the event is not found in history
   */
  async retryPublish(eventId: string, options: PublishOptions = {}): Promise<PublishResult> {
    const history = this.publishHistory.get(eventId);
    if (!history) {
      throw new PublishingFailedError(`No publish history found for event ${eventId}`);
    }
    
    console.log(`PublishingService: Retrying publish for event ${eventId}`);
    return this.publish(history.event, options);
  }
  
  /**
   * Gets the list of available relays
   * 
   * @returns The list of relay URLs
   */
  getRelays(): string[] {
    return nostrService.getRelays().length > 0 ? 
      nostrService.getRelays() : 
      DEFAULT_RELAYS;
  }
}