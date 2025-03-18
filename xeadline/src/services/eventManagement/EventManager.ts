/**
 * Event Manager for the Event Management System
 * 
 * This is the main coordinator class that integrates all the services of the
 * Event Management System.
 */

import { 
  UnsignedEvent, 
  Event, 
  SigningOptions, 
  SigningResult, 
  PublishOptions, 
  PublishResult, 
  SignAndPublishOptions, 
  SignAndPublishResult, 
  EventStatus,
  Priority
} from './types';
import { ValidationService } from './ValidationService';
import { SigningService } from './SigningService';
import { PublishingService } from './PublishingService';
import { QueueManager } from './QueueManager';
import { EventMonitor } from './EventMonitor';
import { EventManagementError } from './errors';

/**
 * Main coordinator for the Event Management System
 */
export class EventManager {
  private validationService: ValidationService;
  private signingService: SigningService;
  private publishingService: PublishingService;
  private queueManager: QueueManager;
  private eventMonitor: EventMonitor;
  
  /**
   * Creates a new EventManager with all required services
   */
  constructor() {
    this.validationService = new ValidationService();
    this.signingService = new SigningService();
    this.publishingService = new PublishingService();
    this.queueManager = new QueueManager();
    this.eventMonitor = new EventMonitor();
    
    // Register event processor
    this.queueManager.registerProcessor(async (queuedEvent) => {
      try {
        // Process the event
        const result = await this.processQueuedEvent(queuedEvent);
        
        // Update event status
        if (result.success && result.event) {
          this.eventMonitor.trackEvent(result.event, {
            id: result.event.id,
            status: 'published',
            createdAt: queuedEvent.createdAt,
            updatedAt: Date.now(),
            publishedTo: result.publishedTo
          });
        } else {
          this.eventMonitor.trackEvent({
            ...queuedEvent.event,
            id: queuedEvent.id,
            sig: ''
          } as Event, {
            id: queuedEvent.id,
            status: 'failed',
            createdAt: queuedEvent.createdAt,
            updatedAt: Date.now(),
            error: result.error
          });
        }
      } catch (error) {
        console.error(`Error processing queued event ${queuedEvent.id}:`, error);
      }
    });
  }
  
  /**
   * Creates a new unsigned event
   * 
   * @param kind The kind of event to create
   * @param content The content of the event
   * @param tags The tags for the event
   * @returns A promise that resolves to the unsigned event
   */
  async createEvent(kind: number, content: string, tags: string[][] = []): Promise<UnsignedEvent> {
    console.log('EventManager: Creating event', { kind, contentLength: content.length, tagCount: tags.length });
    
    // Get the current timestamp
    const created_at = Math.floor(Date.now() / 1000);
    
    // Get the public key
    const pubkey = await this.signingService.getPublicKey();
    
    // Create the unsigned event
    const unsignedEvent: UnsignedEvent = {
      kind,
      created_at,
      tags,
      content,
      pubkey
    };
    
    // Track event creation
    this.eventMonitor.trackEvent({
      ...unsignedEvent,
      id: '',
      sig: ''
    } as Event, {
      id: `${pubkey}-${created_at}`,
      status: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return unsignedEvent;
  }
  
  /**
   * Signs an event
   * 
   * @param event The event to sign
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  async signEvent(event: UnsignedEvent, options?: SigningOptions): Promise<SigningResult> {
    try {
      console.log('EventManager: Signing event', { 
        kind: event.kind, 
        pubkey: event.pubkey.substring(0, 8) + '...',
        hasPrivateKey: !!options?.privateKey,
        hasPassword: !!options?.password
      });
      
      // Validate the event
      await this.validationService.validate(event);
      
      // Track event validation
      this.eventMonitor.trackEvent({
        ...event,
        id: '',
        sig: ''
      } as Event, {
        id: `${event.pubkey}-${event.created_at}`,
        status: 'validated',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // Sign the event
      const result = await this.signingService.sign(event, options);
      
      // Track event signing
      if (result.success && result.event) {
        this.eventMonitor.trackEvent(result.event, {
          id: result.event.id,
          status: 'signed',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in signEvent:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Publishes a signed event
   * 
   * @param event The event to publish
   * @param options Publishing options
   * @returns A promise that resolves to the publish result
   */
  async publishEvent(event: Event, options?: PublishOptions): Promise<PublishResult> {
    try {
      console.log('EventManager: Publishing event', { 
        id: event.id,
        kind: event.kind,
        pubkey: event.pubkey.substring(0, 8) + '...'
      });
      
      // Publish the event
      const result = await this.publishingService.publish(event, options);
      
      // Track event publishing
      if (result.success) {
        this.eventMonitor.trackEvent(event, {
          id: event.id,
          status: 'published',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          publishedTo: result.publishedTo
        });
      } else {
        this.eventMonitor.trackEvent(event, {
          id: event.id,
          status: 'failed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          error: result.error
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in publishEvent:', error);
      
      return {
        success: false,
        publishedTo: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Signs and publishes an event in one operation
   * 
   * @param event The event to sign and publish
   * @param options Signing and publishing options
   * @returns A promise that resolves to the sign and publish result
   */
  async signAndPublishEvent(
    event: UnsignedEvent, 
    options?: SignAndPublishOptions
  ): Promise<SignAndPublishResult> {
    try {
      console.log('EventManager: Signing and publishing event', { 
        kind: event.kind,
        pubkey: event.pubkey.substring(0, 8) + '...',
        skipPublish: options?.skipPublish
      });
      
      // Validate the event
      await this.validationService.validate(event);
      
      // Add to queue with priority from options or default
      const priority = options?.priority || (options?.skipPublish ? Priority.LOW : Priority.NORMAL);
      const queuedEvent = await this.queueManager.enqueue(event, priority);
      
      // Track event queuing
      this.eventMonitor.trackEvent({
        ...event,
        id: '',
        sig: ''
      } as Event, {
        id: queuedEvent.id,
        status: 'queued',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // If we want immediate processing, process now
      if (options?.skipPublish) {
        console.log('EventManager: Skip publish requested, signing only');
        
        // Just sign the event
        const signingResult = await this.signingService.sign(event, options);
        
        return {
          ...signingResult,
          publishedTo: []
        };
      }
      
      // Otherwise, let the queue handle it
      // Return a placeholder result
      console.log('EventManager: Event queued for async processing', { queueId: queuedEvent.id });
      return {
        success: true,
        event: undefined,
        publishedTo: [],
        pendingId: queuedEvent.id
      };
    } catch (error) {
      console.error('Error in signAndPublishEvent:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        publishedTo: []
      };
    }
  }
  
  /**
   * Gets the status of an event
   * 
   * @param id The ID of the event
   * @returns A promise that resolves to the event status, or null if not found
   */
  async getEventStatus(id: string): Promise<EventStatus | null> {
    const history = this.eventMonitor.getEventHistory(id);
    return history.length > 0 ? history[0] : null;
  }
  
  /**
   * Retries publishing an event
   * 
   * @param id The ID of the event
   * @returns A promise that resolves to the sign and publish result
   */
  async retryEvent(id: string): Promise<SignAndPublishResult> {
    const status = await this.getEventStatus(id);
    if (!status) {
      throw new EventManagementError(`No event found with ID ${id}`);
    }
    
    if (status.status === 'published') {
      throw new EventManagementError(`Event ${id} is already published`);
    }
    
    console.log(`EventManager: Retrying event ${id}`);
    
    // Get the event from publish history
    const publishStatus = await this.publishingService.getPublishStatus(id);
    if (!publishStatus) {
      throw new EventManagementError(`No publish history found for event ${id}`);
    }
    
    // Retry publishing
    const result = await this.publishingService.retryPublish(id);
    
    return {
      success: result.success,
      publishedTo: result.publishedTo,
      error: result.error
    };
  }
  
  /**
   * Cancels an event
   * 
   * @param id The ID of the event
   * @returns A promise that resolves to true if the event was cancelled
   */
  async cancelEvent(id: string): Promise<boolean> {
    // Not implemented yet
    throw new EventManagementError('Event cancellation not implemented');
  }
  
  /**
   * Processes a queued event
   * 
   * @param queuedEvent The queued event to process
   * @returns A promise that resolves to the sign and publish result
   */
  private async processQueuedEvent(queuedEvent: any): Promise<SignAndPublishResult> {
    try {
      console.log(`EventManager: Processing queued event ${queuedEvent.id}`);
      
      // Sign the event
      const signingResult = await this.signingService.sign(queuedEvent.event);
      
      if (!signingResult.success || !signingResult.event) {
        console.error('EventManager: Failed to sign queued event', signingResult.error);
        return {
          ...signingResult,
          publishedTo: []
        };
      }
      
      // Publish the event
      const publishResult = await this.publishingService.publish(signingResult.event);
      
      return {
        ...signingResult,
        publishedTo: publishResult.publishedTo,
        error: publishResult.error
      };
    } catch (error) {
      console.error('Error processing queued event:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        publishedTo: []
      };
    }
  }
}