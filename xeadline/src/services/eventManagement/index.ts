/**
 * Event Management System
 * 
 * This module provides a centralized system for managing Nostr events,
 * including creation, validation, signing, and publishing.
 */

import { EventManager } from './EventManager';
import { ValidationService } from './ValidationService';
import { SigningService } from './SigningService';
import { PublishingService } from './PublishingService';
import { QueueManager } from './QueueManager';
import { EventMonitor } from './EventMonitor';
import { createLegacyFunctions } from './adapters/legacyAdapter';
import { useEventSigningAdapter } from './adapters/useEventSigningAdapter';

// Export types
export * from './types';
export * from './errors';
export * from './constants';

// Create singleton instance
const eventManager = new EventManager();

// Create legacy functions for backward compatibility
const { signEvent, publishEvent } = createLegacyFunctions(eventManager);

// Export public API
export {
  // Main manager
  eventManager,
  
  // Legacy compatibility functions
  signEvent,
  publishEvent,
  
  // Hook adapter
  useEventSigningAdapter,
  
  // Individual services (for advanced usage)
  ValidationService,
  SigningService,
  PublishingService,
  QueueManager,
  EventMonitor
};

/**
 * Usage Examples:
 * 
 * Basic usage with singleton:
 * ```typescript
 * import { eventManager } from './services/eventManagement';
 * 
 * // Create and publish an event
 * const event = await eventManager.createEvent(1, 'Hello, world!');
 * const result = await eventManager.signAndPublishEvent(event);
 * ```
 * 
 * Using the hook adapter in React components:
 * ```typescript
 * import { useEventSigningAdapter, eventManager } from './services/eventManagement';
 * 
 * function MyComponent() {
 *   const { signAndPublishEvent } = useEventSigningAdapter(eventManager);
 *   
 *   const handlePost = async () => {
 *     const event = await eventManager.createEvent(1, 'Hello from React!');
 *     await signAndPublishEvent(event, 'post a message');
 *   };
 *   
 *   return <button onClick={handlePost}>Post</button>;
 * }
 * ```
 * 
 * Using legacy functions for backward compatibility:
 * ```typescript
 * import { signEvent, publishEvent } from './services/eventManagement';
 * 
 * // Use just like the old functions
 * const result = await signEvent(unsignedEvent);
 * if (result.success) {
 *   await publishEvent(result.event);
 * }
 * ```
 */