/**
 * Custom event types for Xeadline
 * 
 * These event types are in the 33xxx range as recommended by NIP-33 for application-specific events.
 * Events in this range require a 'd' tag to make them addressable.
 * 
 * Reference: https://github.com/nostr-protocol/nips/blob/master/33.md
 */

export const EVENT_TYPES = {
  // Post types
  TEXT_POST: 33301,   // Text-only posts
  MEDIA_POST: 33302,  // Posts with images, videos, or GIFs
  LINK_POST: 33303,   // Posts with a link as the primary content
  POLL_POST: 33304,   // Posts with a poll
  
  // Comment types
  COMMENT: 33305,     // Comments on posts
  
  // Topic types (not yet implemented)
  TOPIC_CREATE: 33310, // Topic creation
  TOPIC_METADATA: 33311, // Topic metadata updates
  
  // User types (not yet implemented)
  USER_PROFILE: 33320, // User profile information
  USER_SETTINGS: 33321, // User settings
  
  // System types (not yet implemented)
  SYSTEM_ANNOUNCEMENT: 33330, // System announcements
  SYSTEM_NOTIFICATION: 33331  // System notifications
};