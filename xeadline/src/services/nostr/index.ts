/**
 * Nostr Service Exports
 * 
 * This file re-exports the Nostr-related services and utilities.
 * It now uses the new Event Management System internally while
 * maintaining the same API for backward compatibility.
 */

// Import from the new Event Management System
import { 
  signEvent as newSignEvent,
  publishEvent as newPublishEvent,
  eventManager
} from '../eventManagement';

// Re-export the original nostrService for now
// In the future, this could be replaced with a wrapper around the new system
import nostrService from './nostrService';

// Re-export the signEvent function from the new system
export const signEvent = newSignEvent;

// Export types from the new system
export type { 
  UnsignedEvent,
  SigningResult,
  SigningOptions
} from '../eventManagement';

// Export the nostrService and make it the default export
export { nostrService };
export default nostrService;

// Export the eventManager for advanced usage
export { eventManager };