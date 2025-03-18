/**
 * Basic Usage Example for the Event Management System
 * 
 * This file demonstrates how to use the Event Management System for common tasks.
 * It's not meant to be executed directly, but rather to serve as a reference.
 */

import { eventManager } from '../index';
import { Priority } from '../types';

/**
 * Example 1: Creating and publishing a simple text note
 */
async function createAndPublishTextNote() {
  try {
    // Create a text note event
    const textNote = await eventManager.createEvent(
      1, // kind 1 = text note
      'Hello, Nostr world!', // content
      [['t', 'xeadline']] // tags (in this case, a topic tag)
    );
    
    console.log('Created unsigned text note:', textNote);
    
    // Sign and publish the event
    const result = await eventManager.signAndPublishEvent(textNote);
    
    if (result.success && result.event) {
      console.log('Successfully published text note:', result.event.id);
      console.log('Published to relays:', result.publishedTo);
    } else if (result.pendingId) {
      console.log('Event queued for async processing:', result.pendingId);
      
      // You can check the status later
      setTimeout(async () => {
        const status = await eventManager.getEventStatus(result.pendingId!);
        console.log('Event status:', status);
      }, 5000);
    } else {
      console.error('Failed to publish text note:', result.error);
    }
  } catch (error) {
    console.error('Error in createAndPublishTextNote:', error);
  }
}

/**
 * Example 2: Creating a direct message
 */
async function sendDirectMessage(recipientPubkey: string) {
  try {
    // Create a direct message event
    const directMessage = await eventManager.createEvent(
      4, // kind 4 = direct message
      'This is a private message', // content (this would normally be encrypted)
      [['p', recipientPubkey]] // p tag with recipient's pubkey
    );
    
    // Sign the message but don't publish it yet (for review)
    const signResult = await eventManager.signEvent(directMessage);
    
    if (signResult.success && signResult.event) {
      console.log('Signed direct message:', signResult.event);
      
      // Now publish it
      const publishResult = await eventManager.publishEvent(signResult.event);
      
      if (publishResult.success) {
        console.log('Successfully sent direct message');
        console.log('Published to relays:', publishResult.publishedTo);
      } else {
        console.error('Failed to publish direct message:', publishResult.error);
      }
    } else {
      console.error('Failed to sign direct message:', signResult.error);
    }
  } catch (error) {
    console.error('Error in sendDirectMessage:', error);
  }
}

/**
 * Example 3: Creating a high-priority event
 */
async function createHighPriorityEvent() {
  try {
    // Create an event
    const event = await eventManager.createEvent(
      1,
      'This is a high-priority announcement!',
      [['t', 'announcement']]
    );
    
    // Sign and publish with high priority
    const result = await eventManager.signAndPublishEvent(
      event,
      {
        skipPublish: false, // Ensure the event is published
        priority: Priority.HIGH // Set high priority for this event
      }
    );
    
    console.log('High-priority event queued for processing');
    
    console.log('High-priority event result:', result);
  } catch (error) {
    console.error('Error in createHighPriorityEvent:', error);
  }
}

/**
 * Example 4: Retrying a failed event
 */
async function retryFailedEvent(eventId: string) {
  try {
    // Get the current status
    const status = await eventManager.getEventStatus(eventId);
    
    if (status && status.status === 'failed') {
      console.log('Retrying failed event:', eventId);
      
      // Retry the event
      const result = await eventManager.retryEvent(eventId);
      
      if (result.success) {
        console.log('Successfully retried event');
        console.log('Published to relays:', result.publishedTo);
      } else {
        console.error('Failed to retry event:', result.error);
      }
    } else {
      console.log('Event is not in failed state:', status);
    }
  } catch (error) {
    console.error('Error in retryFailedEvent:', error);
  }
}

/**
 * Example 5: Getting metrics
 */
function getEventMetrics() {
  // Access the EventMonitor directly for advanced usage
  const metrics = eventManager['eventMonitor'].getMetrics();
  
  console.log('Event Metrics:');
  console.log('- Total Events:', metrics.totalEvents);
  console.log('- Successful Events:', metrics.successfulEvents);
  console.log('- Failed Events:', metrics.failedEvents);
  console.log('- Success Rate:', (metrics.publishSuccessRate * 100).toFixed(2) + '%');
  console.log('- Average Processing Time:', metrics.averageProcessingTime.toFixed(2) + 'ms');
}

// These functions are not meant to be executed directly,
// but rather to serve as examples of how to use the Event Management System.