/**
 * Constants and configuration for the Event Management System
 * 
 * This file contains default values, timeouts, and configuration settings
 * used throughout the Event Management System.
 */

// Default timeout values (in milliseconds)
export const DEFAULT_SIGNING_TIMEOUT = 15000;
export const DEFAULT_PUBLISHING_TIMEOUT = 10000;
export const DEFAULT_QUEUE_PROCESSING_INTERVAL = 100;

// Retry configuration
export const MAX_SIGNING_RETRIES = 3;
export const MAX_PUBLISHING_RETRIES = 5;
export const RETRY_BACKOFF_FACTOR = 2;

// Queue configuration
export const MAX_QUEUE_SIZE = 100;
export const MAX_CONCURRENT_PROCESSING = 5;

// Event types
export const EVENT_TYPES = {
  // Standard Nostr event kinds (NIP-01)
  TEXT_NOTE: 1,
  RECOMMEND_RELAY: 2,
  CONTACT_LIST: 3,
  DIRECT_MESSAGE: 4,
  DELETE: 5,
  REPOST: 6,
  REACTION: 7,
  BADGE_AWARD: 8,
  
  // Xeadspace-specific event kinds
  TOPIC_DEFINITION: 34550,  // NIP-72 topic definition
  TOPIC_APPROVAL: 4550,     // NIP-72 approval event
  TOPIC_POST: 1,            // Regular post in a topic (uses standard kind 1 with topic tag)
  TOPIC_VOTE: 7,            // Vote on a topic post (uses standard kind 7 with +/-)
  
  // Other potentially useful event kinds
  POLL: 1068,               // NIP-88 poll
  POLL_RESPONSE: 1018,      // NIP-88 poll response
  LONG_FORM: 30023,         // NIP-23 long-form content
  HIGHLIGHT: 9802,          // NIP-84 highlight
  COMMUNITY_LIST: 10004,    // NIP-51 list of communities
  
  // Replaceable events
  PROFILE_METADATA: 0,      // NIP-01 profile metadata
  RELAY_LIST: 10002,        // NIP-65 relay list
  
  // Zap-related events (if Lightning integration is planned)
  ZAP_REQUEST: 9734,        // NIP-57 zap request
  ZAP_RECEIPT: 9735,        // NIP-57 zap receipt
};

// Default relays (copied from nostrService.ts)
// Note: relay.xeadline.com is kept for backward compatibility
export const DEFAULT_RELAYS = [
  'wss://relay.xeadline.com',
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://purplepag.es'
];