# Custom Event Types Implementation Plan

This document outlines the specific code changes needed to implement the custom event types defined in `CUSTOM_EVENT_TYPES.md`.

## 1. Define Event Type Constants

First, let's create constants for our custom event types to make them easier to reference throughout the codebase.

Create a new file `src/constants/eventTypes.ts`:

```typescript
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
```

## 2. Modify TopicPostCreationForm.tsx

Update the `handleSubmit` function in `src/components/topic/TopicPostCreationForm.tsx` to use the appropriate event kind based on post type:

```typescript
import { EVENT_TYPES } from '../../constants/eventTypes';
import { v4 as uuidv4 } from 'uuid'; // Add UUID library for generating unique identifiers

// Inside handleSubmit function:
let eventKind: number;
const uniqueId = uuidv4(); // Generate a unique identifier for the 'd' tag

// Format content based on post type
switch (postType) {
  case 'text':
    eventKind = EVENT_TYPES.TEXT_POST;
    eventContent = JSON.stringify({
      title,
      text: content,
      type: 'text'
    });
    break;
  case 'link':
    eventKind = EVENT_TYPES.LINK_POST;
    eventContent = JSON.stringify({
      title,
      url: linkUrl,
      type: 'link',
      // Include link preview data if available
      linkPreview: embeddedContents.length > 0 ? embeddedContents[0] : undefined
    });
    break;
  case 'media':
    eventKind = EVENT_TYPES.MEDIA_POST;
    eventContent = JSON.stringify({
      title,
      text: content,
      media: mediaUrls,
      embeds: embeddedContents,
      type: 'media'
    });
    break;
  case 'poll':
    eventKind = EVENT_TYPES.POLL_POST;
    eventContent = JSON.stringify({
      title,
      text: content,
      type: 'poll'
    });
    break;
  default:
    eventKind = EVENT_TYPES.TEXT_POST;
}

// Add the 'd' tag required for addressable events
eventTags.push(['d', uniqueId]);

// Create post event using the EventManager with the appropriate kind
const event = await eventManager.createEvent(
  eventKind, // Use the appropriate kind based on post type
  eventContent,
  eventTags
);
```

## 3. Update Post Fetching Logic

Modify the `fetchPostsForTopic` function in `src/redux/slices/postSlice.ts` to query for the new event kinds:

```typescript
import { EVENT_TYPES } from '../../constants/eventTypes';

// Inside fetchPostsForTopic function:
const filters: Filter[] = [
  {
    kinds: [
      EVENT_TYPES.TEXT_POST,
      EVENT_TYPES.MEDIA_POST,
      EVENT_TYPES.LINK_POST,
      EVENT_TYPES.POLL_POST
    ], // Query for all post types
    '#t': [topicId], // Filter by topic ID
    limit: 50
  }
];
```

## 4. Update Post Rendering Logic

Ensure the `PostCard.tsx` component can handle all post types:

```typescript
// No changes needed to the rendering logic since we're maintaining the same content structure
// The component already handles different post types based on the content.type field
```

## 5. Add Comment Support

For the comment functionality (when implemented):

```typescript
// Example code for creating a comment
const commentEventTags = [
  ['t', topicId], // Associate with topic
  ['d', uuidv4()], // Unique identifier for this comment
  ['e', parentPostId, '', 'root'] // Reference to the parent post
];

const commentEvent = await eventManager.createEvent(
  EVENT_TYPES.COMMENT,
  JSON.stringify({
    text: commentContent,
    type: 'comment'
  }),
  commentEventTags
);
```

## 6. Backward Compatibility (Optional)

If needed, implement backward compatibility to fetch and display existing posts that use kind:1:

```typescript
// Add this to the filters array in fetchPostsForTopic
{
  kinds: [1], // Legacy text notes
  '#t': [topicId],
  limit: 50
}
```

## 7. Testing Plan

1. Test creating each type of post (text, media, link, poll)
2. Verify posts are correctly stored with the appropriate event kind
3. Verify posts can be fetched and displayed correctly
4. Test on multiple relays to ensure compatibility
5. Verify posts no longer appear in other Nostr clients that only display kind:1 events

## 8. Deployment Considerations

- Deploy changes to all components simultaneously to maintain consistency
- Monitor relay behavior to ensure proper handling of the new event kinds
- Consider adding a feature flag to easily revert to kind:1 if issues arise