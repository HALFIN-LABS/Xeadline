# Event Types Constants

This document contains the code for the event types constants file that should be created at `src/constants/eventTypes.ts`.

```typescript
/**
 * Nostr Event Types
 * 
 * This file defines constants for Nostr event kinds used throughout the application.
 * It includes both standard Nostr event kinds and Xeadline-specific custom event kinds.
 */

// Xeadline custom event types
export const EVENT_TYPES = {
  // Post types
  TEXT_POST: 33301,
  MEDIA_POST: 33302,
  LINK_POST: 33303,
  POLL_POST: 33304,
  COMMENT: 33305,
  
  // Standard Nostr event types for reference
  METADATA: 0,
  TEXT_NOTE: 1,
  RECOMMEND_RELAY: 2,
  CONTACTS: 3,
  DIRECT_MESSAGE: 4,
  DELETE: 5
};

/**
 * Usage:
 * 
 * import { EVENT_TYPES } from '../../constants/eventTypes';
 * 
 * // Creating a text post
 * const event = await eventManager.createEvent(
 *   EVENT_TYPES.TEXT_POST,
 *   eventContent,
 *   eventTags
 * );
 * 
 * // Fetching posts
 * const filters = [
 *   {
 *     kinds: [
 *       EVENT_TYPES.TEXT_POST,
 *       EVENT_TYPES.MEDIA_POST,
 *       EVENT_TYPES.LINK_POST,
 *       EVENT_TYPES.POLL_POST
 *     ],
 *     '#t': [topicId]
 *   }
 * ];
 */
```

## Implementation Notes

1. Create this file at `src/constants/eventTypes.ts`
2. Import and use these constants in the components that create or fetch posts
3. This will ensure consistency in event kind usage throughout the application