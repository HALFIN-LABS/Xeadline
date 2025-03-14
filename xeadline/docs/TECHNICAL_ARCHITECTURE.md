# Xeadline Technical Architecture

## Overview

This document outlines the technical architecture for Xeadline, a decentralized Reddit alternative built on Nostr and Lightning Network. The architecture is designed to provide a responsive, scalable platform that leverages the decentralized nature of Nostr while maintaining a user-friendly experience similar to Reddit.

## System Architecture

Xeadline follows a client-centric architecture where most of the application logic resides in the client, with minimal server-side components primarily used for caching and performance optimization.

### High-Level Architecture Diagram

```
+---------------------+     +----------------------+     +------------------------+
|                     |     |                      |     |                        |
|  Client Application |<--->|  Caching & Services  |<--->|  Nostr Infrastructure  |
|  (Next.js)          |     |  (Redis, Supabase)   |     |  (Relays)              |
|                     |     |                      |     |                        |
+---------------------+     +----------------------+     +------------------------+
         ^                                                          ^
         |                                                          |
         v                                                          v
+---------------------+                                  +------------------------+
|                     |                                  |                        |
|  User's Browser     |                                  |  Lightning Network     |
|  (WebLN, nos2x)     |<---------------------------------|  (Payment Channels)    |
|                     |                                  |                        |
+---------------------+                                  +------------------------+
```

## Client Application Architecture

The client application is built using Next.js with a Redux state management system and follows a component-based architecture.

### Client Architecture Diagram

```
+-----------------------------------------------------------------------+
|                                                                       |
|                         Next.js Application                           |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-------------------+  +-------------------+  +-------------------+  |
|  |                   |  |                   |  |                   |  |
|  |  Pages            |  |  Components       |  |  Hooks            |  |
|  |                   |  |                   |  |                   |  |
|  +-------------------+  +-------------------+  +-------------------+  |
|                                                                       |
|  +-------------------+  +-------------------+  +-------------------+  |
|  |                   |  |                   |  |                   |  |
|  |  Redux Store      |  |  Services         |  |  Utils            |  |
|  |                   |  |                   |  |                   |  |
|  +-------------------+  +-------------------+  +-------------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Key Components

#### Pages

- **Home Page**: Displays personalized feed or popular content
- **Community Page**: Shows posts from a specific community
- **Post Detail Page**: Displays a post and its comments
- **Profile Page**: Shows user information and activity
- **Settings Page**: User preferences and configuration
- **Authentication Pages**: Login, signup, key generation

#### Components

- **Layout Components**: Navigation, sidebars, footers
- **Post Components**: Post cards, post editor, voting UI
- **Comment Components**: Comment threads, comment editor
- **Community Components**: Community cards, creation form
- **User Components**: Profile display, settings forms
- **Lightning Components**: Tipping UI, payment modals

#### Services

- **NostrService**: Handles communication with Nostr relays
- **SubscriptionManager**: Manages Nostr event subscriptions
- **EventPublisher**: Publishes events to Nostr relays
- **CacheService**: Manages client-side caching
- **LightningService**: Handles Lightning Network interactions
- **AuthService**: Manages authentication and key handling

#### Redux Store

- **authSlice**: Authentication state and user information
- **postSlice**: Post data and interactions
- **commentSlice**: Comment data and threading
- **communitySlice**: Community information and subscriptions
- **uiSlice**: UI state (theme, sidebar visibility, etc.)
- **lightningSlice**: Lightning wallet connection and payments

## Data Architecture

### Nostr Event Types

Xeadline uses standard Nostr event kinds with custom tags to represent different types of content:

#### User Profile (kind:0)

```json
{
  "kind": 0,
  "content": "{\"name\":\"username\",\"about\":\"user bio\",\"picture\":\"https://example.com/avatar.jpg\"}",
  "tags": [
    ["client", "xeadline"],
    ["nip05", "user@domain.com"]
  ]
}
```

#### Post (kind:1 with community tag)

```json
{
  "kind": 1,
  "content": "Post content text",
  "tags": [
    ["a", "34550:pubkey:community-id"],
    ["subject", "Post Title"],
    ["client", "xeadline"],
    ["xd", "post"],
    ["t", "topic1"],
    ["t", "topic2"]
  ]
}
```

#### Comment (kind:1 with reference to post)

```json
{
  "kind": 1,
  "content": "Comment text",
  "tags": [
    ["e", "original-post-id", "", "root"],
    ["e", "parent-comment-id", "", "reply"],
    ["client", "xeadline"],
    ["xd", "comment"]
  ]
}
```

#### Reaction/Vote (kind:7)

```json
{
  "kind": 7,
  "content": "+", // "+" for upvote, "-" for downvote
  "tags": [
    ["e", "post-or-comment-id", "wss://relay.xeadline.com"],
    ["p", "post-or-comment-author-pubkey"],
    ["k", "1"],
    ["client", "xeadline"],
    ["xd", "vote"]
  ]
}
```

#### Community Definition (kind:34550 per NIP-72)

```json
{
  "kind": 34550,
  "content": "{\"description\":\"Community description\",\"rules\":[\"Rule 1\",\"Rule 2\"],\"image\":\"https://example.com/community.jpg\",\"moderationSettings\":{\"moderationType\":\"post-publication\"}}",
  "tags": [
    ["d", "community-id"],
    ["name", "Community Name"],
    ["client", "xeadline"],
    ["xd", "community"],
    ["p", "moderator-pubkey", "moderator"]
  ]
}
```

#### Moderation Action (kind:4550 per NIP-72)

```json
{
  "kind": 4550,
  "content": "{\"id\":\"post-id\",\"pubkey\":\"author-pubkey\",\"kind\":1,...}", // Full JSON-encoded post
  "tags": [
    ["a", "34550:pubkey:community-id", "wss://relay.xeadline.com"],
    ["e", "post-id", "wss://relay.xeadline.com"],
    ["p", "post-author-pubkey"],
    ["k", "1"],
    ["client", "xeadline"],
    ["xd", "moderation"]
  ]
}
```

### Xeadline-Specific Event Kinds

Xeadline defines several custom event kinds that extend the Nostr protocol for platform-specific functionality:

1. **Community Subscription (kind:30001)**: Used to track user subscriptions to communities
2. **Report (kind:1984)**: Used for reporting content that violates community rules
3. **Lightning Tip (kind:9735)**: Used for recording Lightning Network tips for content

These event kinds are not part of any NIP and may not be recognized by other Nostr clients. They follow the Nostr event structure and are processed by the Xeadline application.

### Data Flow

1. **Content Creation**:

   - User creates content in the client
   - Client formats as appropriate Nostr event
   - Event is signed with user's private key
   - Event is published to connected relays
   - Event is added to local state for immediate feedback

2. **Content Consumption**:

   - Client subscribes to relevant events based on view
   - Events are received from relays
   - Events are processed and normalized
   - Normalized data is stored in Redux
   - Components render based on Redux state

3. **Interactions**:

   - User interactions (votes, comments) create new events
   - Events are published to relays
   - Local state is updated optimistically
   - Confirmation from relays updates final state

4. **Caching**:
   - Frequently accessed data is cached client-side
   - Popular content is cached in Redis/Supabase
   - Cache invalidation occurs on relevant new events

## Nostr Integration

### Relay Configuration

Xeadline uses the same relay as xeadline-news:

- Primary Relay: wss://relay.xeadline.com
- Fallback Strategy: Connect to additional public relays if primary is unavailable

### Subscription Management

The application uses a sophisticated subscription management system to minimize data transfer and optimize performance:

1. **Targeted Subscriptions**: Subscribe only to events relevant to current view
2. **Pagination**: Request limited sets of events with pagination
3. **Filters**: Use specific filters to narrow event scope
4. **Caching**: Cache subscription results to reduce relay load
5. **Reuse**: Reuse existing subscriptions when possible

### Event Publishing

Event publishing follows these steps:

1. Create event object with appropriate kind and tags
2. Sign event with user's private key (or via extension)
3. Publish to primary relay
4. Verify receipt and propagation
5. Update local state

## Authentication System

Xeadline supports multiple authentication methods:

### Key Generation

For new users:

1. Generate secure key pair in the browser
2. Encrypt private key with user password
3. Store encrypted key in localStorage
4. Associate public key with user profile

### Private Key Login

For returning users:

1. Retrieve encrypted private key from localStorage
2. Decrypt with user password
3. Use for signing events

### Extension Support

For users with Nostr extensions:

1. Detect available extensions (nos2x, etc.)
2. Request permission to use extension for signing
3. Use extension API for event signing

### nsec Key Import

For users with existing Nostr identities:

1. Accept nsec key input
2. Validate key format
3. Encrypt with new password
4. Store encrypted key

## Lightning Network Integration

### WebLN Integration

Xeadline integrates with Lightning wallets through WebLN:

1. **Wallet Detection**: Detect available WebLN providers
2. **Connection**: Establish connection with user permission
3. **Payments**: Request payments for tips and anti-spam measures
4. **Verification**: Verify payment completion

### Payment Flows

#### Tipping Flow

1. User clicks tip button on content
2. Tipping modal opens with amount selection
3. WebLN payment request is generated
4. User approves payment in wallet
5. Payment verification is recorded in Nostr event
6. UI updates to reflect successful tip

#### Anti-Spam Measures

1. New user attempts to post in community
2. System checks user reputation/history
3. If below threshold, small payment is requested
4. User completes payment via WebLN
5. Payment proof is attached to post event
6. Post is published with payment verification

## Caching Strategy

Xeadline implements a multi-level caching strategy:

### Client-Side Cache

- **Redux Persistence**: Core state persisted to localStorage
- **Browser Cache**: Static assets cached via service worker
- **Memory Cache**: Frequent data cached in memory

### Server-Side Cache

- **Redis Cache**: Short-term caching of popular content
- **Supabase Cache**: Longer-term storage of processed events

### Cache Invalidation

- **Time-Based**: Expire cache entries after set period
- **Event-Based**: Invalidate cache when new events affect content
- **Manual**: Force refresh option for users

## Performance Optimizations

### Client-Side Optimizations

- **Code Splitting**: Load only necessary code for each page
- **Lazy Loading**: Defer loading of off-screen content
- **Image Optimization**: Next.js image optimization
- **Memoization**: Prevent unnecessary re-renders

### Nostr Optimizations

- **Efficient Filters**: Minimize data transfer with precise filters
- **Batched Requests**: Combine related subscriptions
- **Connection Management**: Maintain efficient relay connections

## Security Considerations

### Key Management

- Private keys never transmitted to server
- Keys encrypted with strong algorithms
- Multiple authentication options for user preference

### Content Security

- Client-side content filtering
- Community-based moderation
- Report system for problematic content

### Lightning Security

- No custody of user funds
- Direct wallet-to-wallet payments
- Payment verification through Nostr events

## Deployment Architecture

### Client Deployment

- Next.js application deployed to Vercel or similar platform
- Static assets served via CDN
- API routes for server-side operations

### Caching Infrastructure

- Redis instance for high-speed caching
- Supabase for structured data caching and search

### Monitoring

- Application performance monitoring
- Error tracking and reporting
- Usage analytics for optimization

## Development Workflow

### Local Development

- Next.js development server
- Local Nostr relay for testing
- Mock Lightning payments for development

### Testing Strategy

- Unit tests for core functionality
- Integration tests for Nostr event handling
- End-to-end tests for critical user flows
- Visual regression tests for UI components

### Continuous Integration

- Automated testing on pull requests
- Build verification
- Deployment previews

## Conclusion

The Xeadline technical architecture leverages the decentralized nature of Nostr while providing a user experience comparable to centralized platforms like Reddit. By implementing efficient caching, optimized subscription management, and seamless Lightning Network integration, Xeadline aims to deliver a responsive, feature-rich platform that maintains the benefits of decentralization without sacrificing usability.

This architecture is designed to be scalable and adaptable, allowing for future enhancements while maintaining a solid foundation for the core Reddit-like functionality.
