"use client";

/**
 * Event Signing Hook
 * 
 * This is a wrapper around the new Event Management System that maintains
 * the same API as the original useEventSigning hook for backward compatibility.
 */

// Re-export the types from the new system
export type {
  SignAndPublishOptions,
  SignAndPublishResult,
  SigningOptions,
  SigningResult,
  UnsignedEvent
} from '../services/eventManagement';

// Import the adapter hook from the new system
import { 
  useEventSigningAdapter,
  eventManager
} from '../services/eventManagement';

/**
 * Hook for signing and publishing Nostr events
 * 
 * This hook provides the same API as the original useEventSigning hook
 * but uses the new Event Management System internally.
 * 
 * @returns An object with functions for signing and publishing events
 */
export function useEventSigning() {
  // Use the adapter hook from the new system
  return useEventSigningAdapter(eventManager);
}