/**
 * Queue Manager for the Event Management System
 * 
 * This service manages the queue of events to be processed, with support for
 * prioritization, concurrency control, and queue persistence.
 */

import { UnsignedEvent, QueuedEvent, Priority, QueueStatus } from './types';
import { QueueError } from './errors';
import { 
  MAX_QUEUE_SIZE, 
  MAX_CONCURRENT_PROCESSING, 
  DEFAULT_QUEUE_PROCESSING_INTERVAL 
} from './constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Type definition for event processors
 */
type EventProcessor = (event: QueuedEvent) => Promise<void>;

/**
 * Service for managing the event processing queue
 */
export class QueueManager {
  private queue: QueuedEvent[] = [];
  private processing: Set<string> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;
  private eventProcessors: Map<string, EventProcessor> = new Map();
  
  /**
   * Creates a new QueueManager and starts processing
   */
  constructor() {
    // Start processing queue
    this.startProcessing();
  }
  
  /**
   * Adds an event to the queue
   * 
   * @param event The event to enqueue
   * @param priority The priority of the event
   * @returns A promise that resolves to the queued event
   * @throws QueueError if the queue is full
   */
  async enqueue(event: UnsignedEvent, priority: Priority = Priority.NORMAL): Promise<QueuedEvent> {
    // Check if queue is full
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new QueueError(`Queue is full (max size: ${MAX_QUEUE_SIZE})`);
    }
    
    console.log('QueueManager: Enqueueing event', {
      eventKind: event.kind,
      priority
    });
    
    // Create queued event
    const queuedEvent: QueuedEvent = {
      id: uuidv4(),
      event,
      priority,
      createdAt: Date.now(),
      status: 'queued'
    };
    
    // Add to queue based on priority
    if (priority === Priority.HIGH) {
      this.queue.unshift(queuedEvent);
    } else {
      this.queue.push(queuedEvent);
    }
    
    return queuedEvent;
  }
  
  /**
   * Gets the next event from the queue
   * 
   * @returns A promise that resolves to the next event, or null if the queue is empty
   */
  async dequeue(): Promise<QueuedEvent | null> {
    // Sort queue by priority and creation time
    this.queue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.createdAt - b.createdAt;
      }
      
      if (a.priority === Priority.HIGH) return -1;
      if (b.priority === Priority.HIGH) return 1;
      if (a.priority === Priority.NORMAL) return -1;
      return 1;
    });
    
    // Get next event
    const event = this.queue.shift();
    if (!event) {
      return null;
    }
    
    // Mark as processing
    event.status = 'processing';
    this.processing.add(event.id);
    
    console.log('QueueManager: Dequeued event', {
      eventId: event.id,
      eventKind: event.event.kind,
      priority: event.priority
    });
    
    return event;
  }
  
  /**
   * Registers an event processor
   * 
   * @param processor The processor function
   * @returns The ID of the registered processor
   */
  registerProcessor(processor: EventProcessor): string {
    const id = uuidv4();
    this.eventProcessors.set(id, processor);
    console.log(`QueueManager: Registered processor ${id}`);
    return id;
  }
  
  /**
   * Unregisters an event processor
   * 
   * @param id The ID of the processor to unregister
   */
  unregisterProcessor(id: string): void {
    this.eventProcessors.delete(id);
    console.log(`QueueManager: Unregistered processor ${id}`);
  }
  
  /**
   * Gets the current status of the queue
   * 
   * @returns A promise that resolves to the queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxSize: MAX_QUEUE_SIZE
    };
  }
  
  /**
   * Clears the queue
   * 
   * @returns A promise that resolves when the queue is cleared
   */
  async clearQueue(): Promise<void> {
    console.log('QueueManager: Clearing queue');
    this.queue = [];
  }
  
  /**
   * Starts processing the queue
   */
  private startProcessing(): void {
    console.log('QueueManager: Starting queue processing');
    
    this.processingInterval = setInterval(async () => {
      // Skip if we're already processing the maximum number of events
      if (this.processing.size >= MAX_CONCURRENT_PROCESSING) {
        return;
      }
      
      // Skip if there are no processors
      if (this.eventProcessors.size === 0) {
        return;
      }
      
      // Get next event
      const event = await this.dequeue();
      if (!event) {
        return;
      }
      
      console.log(`QueueManager: Processing event ${event.id}`);
      
      // Process event with all processors
      for (const processor of Array.from(this.eventProcessors.values())) {
        try {
          await processor(event);
        } catch (error) {
          console.error(`QueueManager: Error processing event ${event.id}:`, error);
        }
      }
      
      // Mark as completed
      this.processing.delete(event.id);
      console.log(`QueueManager: Completed processing event ${event.id}`);
    }, DEFAULT_QUEUE_PROCESSING_INTERVAL);
  }
  
  /**
   * Stops processing the queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('QueueManager: Stopped queue processing');
    }
  }
}