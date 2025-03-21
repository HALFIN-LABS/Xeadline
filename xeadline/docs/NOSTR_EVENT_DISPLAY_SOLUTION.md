# Nostr Event Display Solution

## Problem

When using standard Nostr event kinds (like kind:1 for text notes), Xeadline posts were displaying incorrectly on other Nostr clients. This happened because:

1. Other clients interpret kind:1 events as simple text notes
2. Xeadline posts contain structured data (title, content, media, etc.) in JSON format
3. This structured JSON was being displayed as raw text on other clients

## Solution

We implemented custom event types in the 33xxx range (as recommended by NIP-33) to differentiate Xeadline-specific content from standard Nostr events.

### Custom Event Types

We defined the following custom event types in `src/constants/eventTypes.ts`:

```typescript
export const EVENT_TYPES = {
  TEXT_POST: 33301,
  MEDIA_POST: 33302,
  LINK_POST: 33303,
  POLL_POST: 33304,
  COMMENT: 33305
};
```

### Addressable Events with 'd' Tags

For events in the 30000-40000 range, Nostr requires a 'd' tag to make them addressable. We generate a unique identifier using UUID for each post:

```typescript
const uniqueId = uuidv4(); // Generate a unique identifier for the 'd' tag
let eventTags = [
  ['t', topicId], // Associate with topic
  ['d', uniqueId] // Add the 'd' tag required for addressable events
];
```

### Post Creation

When creating a post, we select the appropriate event kind based on the post type:

```typescript
switch (postType) {
  case 'text':
    eventKind = EVENT_TYPES.TEXT_POST; // 33301
    // ...
  case 'link':
    eventKind = EVENT_TYPES.LINK_POST; // 33303
    // ...
  case 'media':
    eventKind = EVENT_TYPES.MEDIA_POST; // 33302
    // ...
  case 'poll':
    eventKind = EVENT_TYPES.POLL_POST; // 33304
    // ...
}
```

### Post Fetching

When fetching posts, we query for all Xeadline custom post types:

```typescript
// In postSlice.ts
const filter = {
  kinds: [
    EVENT_TYPES.TEXT_POST,   // 33301
    EVENT_TYPES.MEDIA_POST,  // 33302
    EVENT_TYPES.LINK_POST,   // 33303
    EVENT_TYPES.POLL_POST    // 33304
  ],
  // ...
};
```

## Post Card Display

We've updated the PostCard component to handle different post types appropriately:

1. **Text Posts (33301)**: Display the title and text content
2. **Media Posts (33302)**: Display the title, text content, and a square media preview
3. **Link Posts (33303)**: Display the title, URL, and a link preview

### Media Post Display

Media posts (33302) now display with a square preview on the right side of the post card:

```jsx
{/* Media preview for media posts */}
{hasMedia && post.content.media && post.content.media.length > 0 && (
  <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-md">
    <img
      src={post.content.media[0]} // Show the first media item
      alt="Media content"
      className="w-full h-full object-cover"
    />
    {post.content.media.length > 1 && (
      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md">
        +{post.content.media.length - 1}
      </div>
    )}
  </div>
)}
```

## Benefits

1. **Client Compatibility**: Xeadline posts won't appear as raw JSON on other Nostr clients
2. **Improved UX**: Each post type has an appropriate display format
3. **Future Extensibility**: We can add more custom event types as needed
4. **Nostr Compliance**: Follows NIP-33 recommendations for application-specific events

## References

- [NIP-01: Basic protocol flow description](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-33: Parameterized Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/33.md)