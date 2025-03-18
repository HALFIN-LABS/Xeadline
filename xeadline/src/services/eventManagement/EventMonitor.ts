/**
 * Event Monitor for the Event Management System
 * 
 * This service provides monitoring and metrics for events as they move through
 * the Event Management System.
 */

import { Event, EventStatus, EventMetrics } from './types';

/**
 * Service for monitoring events and collecting metrics
 */
export class EventMonitor {
  private eventHistory: Map<string, EventStatus> = new Map();
  private metrics: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    processingTimes: number[];
  } = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    processingTimes: []
  };
  
  /**
   * Tracks an event's status
   * 
   * @param event The event to track
   * @param status The status of the event
   */
  trackEvent(event: Event, status: EventStatus): void {
    console.log(`EventMonitor: Tracking event ${event.id} with status ${status.status}`);
    
    // Update event history
    this.eventHistory.set(event.id, status);
    
    // Update metrics
    if (status.status === 'created') {
      this.metrics.totalEvents++;
    } else if (status.status === 'published') {
      this.metrics.successfulEvents++;
      
      // Calculate processing time
      const created = this.eventHistory.get(event.id);
      if (created) {
        const processingTime = status.updatedAt - created.createdAt;
        this.metrics.processingTimes.push(processingTime);
        console.log(`EventMonitor: Event ${event.id} processed in ${processingTime}ms`);
      }
    } else if (status.status === 'failed') {
      this.metrics.failedEvents++;
      console.log(`EventMonitor: Event ${event.id} failed: ${status.error}`);
    }
  }
  
  /**
   * Gets the event history
   * 
   * @param eventId Optional event ID to filter by
   * @returns An array of event statuses
   */
  getEventHistory(eventId?: string): EventStatus[] {
    if (eventId) {
      const status = this.eventHistory.get(eventId);
      return status ? [status] : [];
    }
    
    return Array.from(this.eventHistory.values());
  }
  
  /**
   * Gets the current metrics
   * 
   * @returns The event metrics
   */
  getMetrics(): EventMetrics {
    const totalEvents = this.metrics.totalEvents;
    const successfulEvents = this.metrics.successfulEvents;
    const failedEvents = this.metrics.failedEvents;
    
    // Calculate average processing time
    const totalProcessingTime = this.metrics.processingTimes.reduce((sum, time) => sum + time, 0);
    const averageProcessingTime = this.metrics.processingTimes.length > 0
      ? totalProcessingTime / this.metrics.processingTimes.length
      : 0;
    
    // Calculate publish success rate
    const publishSuccessRate = totalEvents > 0
      ? successfulEvents / totalEvents
      : 0;
    
    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      averageProcessingTime,
      publishSuccessRate
    };
  }
  
  /**
   * Clears the event history
   */
  clearHistory(): void {
    console.log('EventMonitor: Clearing event history');
    this.eventHistory.clear();
  }
  
  /**
   * Resets the metrics
   */
  resetMetrics(): void {
    console.log('EventMonitor: Resetting metrics');
    this.metrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      processingTimes: []
    };
  }
}