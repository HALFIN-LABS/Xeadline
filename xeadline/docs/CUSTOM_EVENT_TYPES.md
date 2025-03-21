# Xeadline Custom Event Types

## Overview

To prevent Xeadline posts from displaying incorrectly on other Nostr clients, we're implementing custom event types in the addressable range (30000-40000) as defined in NIP-01. This document outlines the event types and their usage.

## Event Type Definitions

| Event Kind | Description | Content Format |
|------------|-------------|----------------|
| 33301 | Text Post | JSON structure with title and text content |
| 33302 | Media Post | JSON structure with title, media URLs, and optional caption |
| 33303 | Link Post | JSON structure with title, URL, and optional link preview data |
| 33304 | Poll Post | JSON structure with title, options, and voting mechanism |
| 33305 | Comment | JSON structure with text content and references to parent post |

## Implementation Details

### Addressable Events

According to NIP-01, events in the 30000-40000 range are "addressable" by their `kind`, `pubkey`, and `d` tag value. This means:

1. Each event must include a `d` tag that serves as a unique identifier within the context of its kind and pubkey
2. Only the latest event with a specific combination of `kind`, `pubkey`, and `d` tag value should be stored by relays
3. Older versions with the same combination may be discarded

Example `d` tag implementation:
```typescript
// For a new post
eventTags.push(['d', uniqueIdentifier]); // Could be a UUID, timestamp, or other unique value
```

### Content Structure

We'll maintain our current JSON structure for the content field, as it won't be displayed in other clients:

```typescript
// Example for a link post (kind 33303)
eventContent = JSON.stringify({
  title,
  url: linkUrl,
  type: 'link',
  linkPreview: embeddedContents.length > 0 ? embeddedContents[0] : undefined
});
```

### References and Threading

For comments (kind 33305), we'll include references to the parent post using the standard Nostr `e` tag:

```typescript
// For a comment on a post
eventTags.push(['e', parentPostId, '', 'root']);
```

## Migration Plan

1. Update the `TopicPostCreationForm.tsx` component to use the appropriate event kind based on post type
2. Add the required `d` tag to all events
3. Update the post fetching logic to query for these new event kinds
4. Implement backward compatibility for existing posts (if needed)

## Benefits

1. Xeadline posts will no longer appear in other Nostr clients that only display kind:1 events
2. We can maintain our structured data format without compromising readability
3. Different post types can be handled specifically by both our client and relays
4. Comments can be properly threaded and associated with their parent posts

## Considerations

- Ensure all relays used by Xeadline support addressable events (30000-40000 range)
- Monitor for potential conflicts with other applications using similar event kinds
- Consider implementing a fallback mechanism for relays that might not support these event kinds