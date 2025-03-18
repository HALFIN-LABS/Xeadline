/**
 * Mock Publishing Service for testing
 * 
 * This is a simplified version of the PublishingService that always succeeds
 * without requiring actual relays.
 */

import { Event, PublishResult, PublishOptions } from '../types';

/**
 * Mock implementation of the PublishingService
 */
export class MockPublishingService {
  private publishHistory: Map<string, { 
    event: Event, 
    result: PublishResult, 
    timestamp: number 
  }> = new Map();
  
  /**
   * Publishes an event to mock relays
   * 
   * @param event The event to publish
   * @param options Publishing options
   * @returns A promise that resolves to the publish result
   */
  async publish(event: Event, options: PublishOptions = {}): Promise<PublishResult> {
    console.log('MockPublishingService: Publishing event', {
      eventId: event.id,
      eventKind: event.kind
    });
    
    // Simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock successful publishing to 3 relays
    const mockRelays = [
      'wss://mock-relay-1.example.com',
      'wss://mock-relay-2.example.com',
      'wss://mock-relay-3.example.com'
    ];
    
    console.log(`MockPublishingService: Successfully published to ${mockRelays.length} relays`);
    
    // Create result
    const result: PublishResult = {
      success: true,
      publishedTo: mockRelays
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
   */
  async retryPublish(eventId: string, options: PublishOptions = {}): Promise<PublishResult> {
    const history = this.publishHistory.get(eventId);
    if (!history) {
      return {
        success: false,
        publishedTo: [],
        error: `No publish history found for event ${eventId}`
      };
    }
    
    console.log(`MockPublishingService: Retrying publish for event ${eventId}`);
    return this.publish(history.event, options);
  }
  
  /**
   * Gets the list of available relays
   * 
   * @returns The list of relay URLs
   */
  getRelays(): string[] {
    return [
      'wss://mock-relay-1.example.com',
      'wss://mock-relay-2.example.com',
      'wss://mock-relay-3.example.com'
    ];
  }
}