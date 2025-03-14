# Xeadline Data Models

## Overview

This document outlines the data models and schemas used in the Xeadline application. It covers Nostr event structures, Redux state organization, and other data storage mechanisms used throughout the application.

## Nostr Event Models

Xeadline uses standard Nostr event kinds with custom tags to represent different types of content. These events form the foundation of the application's data model.

### User Profile (kind:0)

User profiles are stored as Nostr metadata events (kind:0).

```typescript
interface UserProfileEvent {
  kind: 0
  pubkey: string // User's public key
  content: string // JSON string containing profile data
  tags: string[][] // Additional tags
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Content is a JSON string representing:
interface UserProfileContent {
  name?: string // Display name
  displayName?: string // Alternative display name
  about?: string // User bio
  picture?: string // URL to profile picture
  banner?: string // URL to profile banner
  website?: string // User's website
  nip05?: string // NIP-05 verification identifier
  lud16?: string // Lightning address
}

// Common tags
// ["nip05", "user@domain.com"] // NIP-05 identifier
// ["client", "xeadline"] // Client identifier
```

### Post (kind:1 with community tag)

Posts are stored as Nostr text note events (kind:1) with specific tags to associate them with communities.

```typescript
interface PostEvent {
  kind: 1
  pubkey: string // Author's public key
  content: string // Post content
  tags: string[][] // Tags including community reference
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["a", "34550:pubkey:community-id"] // Community reference (NIP-72)
// ["subject", "Post Title"] // Post title
// ["client", "xeadline"] // Client identifier
// ["xd", "post"] // Xeadline-specific tag
// ["t", "topic1"] // Topic/tag
// ["t", "topic2"] // Additional topic/tag
// ["r", "https://example.com"] // External reference/link
```

### Comment (kind:1 with reference to post)

Comments are also stored as Nostr text note events (kind:1) but include references to the original post and parent comment (if a reply).

```typescript
interface CommentEvent {
  kind: 1
  pubkey: string // Author's public key
  content: string // Comment content
  tags: string[][] // Tags including references
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["e", "original-post-id", "", "root"] // Reference to original post
// ["e", "parent-comment-id", "", "reply"] // Reference to parent comment (if a reply)
// ["p", "original-post-author-pubkey"] // Reference to post author
// ["client", "xeadline"] // Client identifier
// ["xd", "comment"] // Xeadline-specific tag
```

### Reaction/Vote (kind:7)

Votes are implemented as Nostr reaction events (kind:7).

```typescript
interface VoteEvent {
  kind: 7
  pubkey: string // Voter's public key
  content: string // "+" for upvote, "-" for downvote
  tags: string[][] // Tags including reference to post/comment
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["e", "post-or-comment-id", "wss://relay.xeadline.com"] // Reference to post or comment with relay hint
// ["p", "post-or-comment-author-pubkey"] // Reference to author
// ["k", "1"] // Kind of the post/comment being voted on
// ["client", "xeadline"] // Client identifier
// ["xd", "vote"] // Xeadline-specific tag
```

### Community Definition (kind:34550 per NIP-72)

Communities are defined using the NIP-72 specification (kind:34550).

```typescript
interface CommunityEvent {
  kind: 34550
  pubkey: string // Creator's public key
  content: string // JSON string containing community data
  tags: string[][] // Tags including community identifier
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Content is a JSON string representing:
interface CommunityContent {
  description: string // Community description
  rules: string[] // Community rules
  image?: string // URL to community image
  banner?: string // URL to community banner
  moderationSettings: {
    moderationType: 'post-publication' | 'pre-approval' | 'hybrid'
    trustThreshold?: number // For hybrid moderation
    requireApprovalForNewUsers?: boolean // For hybrid moderation
    autoApproveAfter?: number // Number of successful posts before auto-approval
  }
}

// Common tags
// ["d", "community-id"] // Community identifier
// ["name", "Community Name"] // Display name
// ["client", "xeadline"] // Client identifier
// ["xd", "community"] // Xeadline-specific tag
// ["p", "moderator-pubkey", "moderator"] // Moderator reference
```

### Community Subscription (kind:30001)

Community subscriptions use a custom event kind.

```typescript
interface CommunitySubscriptionEvent {
  kind: 30001
  pubkey: string // Subscriber's public key
  content: '' // Usually empty
  tags: string[][] // Tags including community reference
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["a", "34550:pubkey:community-id"] // Community reference (NIP-72)
// ["client", "xeadline"] // Client identifier
// ["xd", "subscription"] // Xeadline-specific tag
```

### Moderation Action (kind:4550)

Moderation actions use a custom event kind.

```typescript
interface ModerationEvent {
  kind: 4550
  pubkey: string // Moderator's public key
  content: string // JSON-stringified post event
  tags: string[][] // Tags including references
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["a", "34550:pubkey:community-id", "wss://relay.xeadline.com"] // Community reference with relay hint
// ["e", "post-or-comment-id", "wss://relay.xeadline.com"] // Reference to moderated content with relay hint
// ["p", "content-author-pubkey"] // Reference to content author
// ["k", "1"] // Kind of the post/comment being moderated
// ["client", "xeadline"] // Client identifier
// ["xd", "moderation"] // Xeadline-specific tag
```

### Report (kind:1984)

Reports for rule violations use a custom event kind.

```typescript
interface ReportEvent {
  kind: 1984
  pubkey: string // Reporter's public key
  content: string // Reason for report
  tags: string[][] // Tags including references
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["e", "post-or-comment-id"] // Reference to reported content
// ["p", "content-author-pubkey"] // Reference to content author
// ["a", "34550:pubkey:community-id"] // Community reference
// ["violation", "spam" | "harassment" | "illegal" | "other"] // Type of violation
// ["client", "xeadline"] // Client identifier
// ["xd", "report"] // Xeadline-specific tag
```

### Lightning Tip (kind:9735)

Lightning tips use a custom event kind.

```typescript
interface TipEvent {
  kind: 9735
  pubkey: string // Tipper's public key
  content: string // Optional message
  tags: string[][] // Tags including references
  created_at: number // Unix timestamp
  id: string // Event ID
  sig: string // Signature
}

// Common tags
// ["e", "post-or-comment-id"] // Reference to tipped content
// ["p", "content-author-pubkey"] // Reference to content author
// ["amount", "1000"] // Amount in millisatoshis
// ["bolt11", "lnbc..."] // Lightning invoice
// ["preimage", "..."] // Payment preimage (proof of payment)
// ["client", "xeadline"] // Client identifier
// ["xd", "tip"] // Xeadline-specific tag
```

## Normalized Data Models

The application normalizes Nostr events into structured data models for use in the Redux store and throughout the application.

### User Model

```typescript
interface User {
  pubkey: string
  name?: string
  displayName?: string
  about?: string
  picture?: string
  banner?: string
  website?: string
  nip05?: string
  nip05Valid?: boolean
  lud16?: string
  createdAt: number
  updatedAt: number
  following?: string[] // Pubkeys of followed users
  followers?: number // Count of followers
  postCount?: number // Count of posts
  reputation?: number // Calculated reputation score
}
```

### Post Model

```typescript
interface Post {
  id: string
  pubkey: string // Author's public key
  communityId: string
  title: string
  content: string
  createdAt: number
  tags: string[]
  voteCount: number
  upvotes: number
  downvotes: number
  commentCount: number
  userVote: 'upvote' | 'downvote' | null // Current user's vote
  author?: User // Denormalized author data
  community?: Community // Denormalized community data
  approved?: boolean // Whether post is approved by moderators
  removed?: boolean // Whether post is removed by moderators
  images?: string[] // URLs of embedded images
  links?: string[] // External links in post
}
```

### Comment Model

```typescript
interface Comment {
  id: string
  pubkey: string // Author's public key
  postId: string // Original post ID
  parentId?: string // Parent comment ID (if a reply)
  content: string
  createdAt: number
  voteCount: number
  upvotes: number
  downvotes: number
  replyCount: number
  userVote: 'upvote' | 'downvote' | null // Current user's vote
  author?: User // Denormalized author data
  approved?: boolean // Whether comment is approved by moderators
  removed?: boolean // Whether comment is removed by moderators
  depth: number // Nesting level in thread
}
```

### Community Model

```typescript
interface Community {
  id: string
  pubkey: string // Creator's public key
  name: string
  description: string
  rules: string[]
  image?: string
  banner?: string
  createdAt: number
  moderators: string[] // Pubkeys of moderators
  memberCount: number
  postCount: number
  userIsSubscribed: boolean // Whether current user is subscribed
  moderationSettings: {
    moderationType: 'post-publication' | 'pre-approval' | 'hybrid'
    trustThreshold?: number
    requireApprovalForNewUsers?: boolean
    autoApproveAfter?: number
  }
}
```

### Moderation Action Model

```typescript
interface ModerationAction {
  id: string
  pubkey: string // Moderator's public key
  targetId: string // Post or comment ID
  targetPubkey: string // Author's public key
  communityId: string
  action: 'remove' | 'approve'
  reason: string
  createdAt: number
  moderator?: User // Denormalized moderator data
}
```

### Report Model

```typescript
interface Report {
  id: string
  pubkey: string // Reporter's public key
  targetId: string // Post or comment ID
  targetPubkey: string // Author's public key
  communityId: string
  violationType: 'spam' | 'harassment' | 'illegal' | 'other'
  reason: string
  createdAt: number
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  reporter?: User // Denormalized reporter data
}
```

### Tip Model

```typescript
interface Tip {
  id: string
  pubkey: string // Tipper's public key
  targetId: string // Post or comment ID
  targetPubkey: string // Author's public key
  amount: number // Amount in millisatoshis
  message?: string
  createdAt: number
  invoice: string // Lightning invoice
  preimage?: string // Payment proof
  tipper?: User // Denormalized tipper data
}
```

## Redux State Structure

The Redux store is organized into slices that manage different aspects of the application state.

### Auth Slice

```typescript
interface AuthState {
  user: User | null // Current user
  publicKey: string | null // User's public key
  privateKey: string | null // Encrypted private key (if stored)
  hasExtension: boolean // Whether Nostr extension is available
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}
```

### Posts Slice

```typescript
interface PostsState {
  byId: Record<string, Post> // Normalized posts by ID
  allIds: string[] // All post IDs
  feedIds: {
    // IDs organized by feed type
    home: string[]
    popular: string[]
    community: Record<string, string[]> // By community ID
  }
  loading: boolean
  error: string | null
  currentPostId: string | null // Currently viewed post
}
```

### Comments Slice

```typescript
interface CommentsState {
  byId: Record<string, Comment> // Normalized comments by ID
  byPost: Record<string, string[]> // Comment IDs by post ID
  byParent: Record<string, string[]> // Reply IDs by parent comment ID
  rootCommentsByPost: Record<string, string[]> // Root comment IDs by post ID
  loading: boolean
  error: string | null
}
```

### Communities Slice

```typescript
interface CommunitiesState {
  byId: Record<string, Community> // Normalized communities by ID
  allIds: string[] // All community IDs
  subscribed: string[] // IDs of subscribed communities
  popular: string[] // IDs of popular communities
  new: string[] // IDs of new communities
  loading: boolean
  error: string | null
  currentCommunityId: string | null // Currently viewed community
}
```

### Users Slice

```typescript
interface UsersState {
  byId: Record<string, User> // Normalized users by ID
  loading: boolean
  error: string | null
  currentUserProfile: string | null // Currently viewed user profile
}
```

### Moderation Slice

```typescript
interface ModerationState {
  actions: Record<string, ModerationAction> // Moderation actions by ID
  reports: Record<string, Report> // Reports by ID
  reportsByTarget: Record<string, string[]> // Report IDs by target content ID
  reportsByCommunity: Record<string, string[]> // Report IDs by community ID
  loading: boolean
  error: string | null
}
```

### Lightning Slice

```typescript
interface LightningState {
  connected: boolean // Whether WebLN is connected
  provider: string | null // Name of connected provider
  balance?: number // Balance if available
  tips: Record<string, Tip> // Tips by ID
  tipsByTarget: Record<string, string[]> // Tip IDs by target content ID
  loading: boolean
  error: string | null
}
```

### UI Slice

```typescript
interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  currentSort: 'hot' | 'new' | 'top'
  timeFilter: 'day' | 'week' | 'month' | 'year' | 'all'
  notifications: {
    items: Notification[]
    unread: number
  }
  modals: {
    createPost: boolean
    createCommunity: boolean
    login: boolean
    lightning: boolean
  }
  toasts: Toast[]
}

interface Notification {
  id: string
  type: 'reply' | 'mention' | 'vote' | 'tip' | 'moderation'
  read: boolean
  createdAt: number
  data: any // Notification-specific data
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration: number
}
```

### Relay Slice

```typescript
interface RelayState {
  url: string // Current relay URL
  connected: boolean
  connecting: boolean
  error: string | null
  subscriptions: Record<string, Subscription> // Active subscriptions
  stats: {
    eventsReceived: number
    eventsSent: number
    lastConnected: number | null
  }
}

interface Subscription {
  id: string
  filters: any[] // Subscription filters
  active: boolean
  eose: boolean // End of stored events received
  lastUpdated: number
}
```

## Local Storage Models

The application uses local storage for persisting certain data between sessions.

### Encrypted Private Key

```typescript
interface EncryptedKeyData {
  encryptedKey: string // Encrypted private key
  salt: string // Salt used for encryption
  iv: string // Initialization vector
  algorithm: string // Encryption algorithm used
}
```

### User Settings

```typescript
interface StoredUserSettings {
  theme: 'light' | 'dark' | 'system'
  contentFilter: 'lenient' | 'standard' | 'strict'
  hideNsfw: boolean
  showOnlyApprovedPosts: boolean
  hiddenCommunities: string[] // IDs of hidden communities
  hiddenUsers: string[] // Pubkeys of hidden users
  defaultSort: 'hot' | 'new' | 'top'
  defaultTimeFilter: 'day' | 'week' | 'month' | 'year' | 'all'
}
```

### Cache Data

```typescript
interface CacheData {
  timestamp: number // When cache was created
  expiry: number // When cache expires
  data: any // Cached data
}
```

## Database Models (Supabase)

For performance optimization, certain data is cached in Supabase.

### Cached Communities Table

```sql
CREATE TABLE cached_communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB,
  moderators JSONB,
  moderation_settings JSONB,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT,
  banner_url TEXT,
  data JSONB
);
```

### Cached Posts Table

```sql
CREATE TABLE cached_posts (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES cached_communities(id),
  pubkey TEXT NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT FALSE,
  removed BOOLEAN DEFAULT FALSE,
  tags JSONB,
  data JSONB
);
```

### Cached User Profiles Table

```sql
CREATE TABLE cached_user_profiles (
  pubkey TEXT PRIMARY KEY,
  name TEXT,
  display_name TEXT,
  about TEXT,
  picture TEXT,
  nip05 TEXT,
  reputation INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB
);
```

### Community Subscriptions Table

```sql
CREATE TABLE community_subscriptions (
  pubkey TEXT NOT NULL,
  community_id TEXT NOT NULL REFERENCES cached_communities(id),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pubkey, community_id)
);
```

### User Reputation Table

```sql
CREATE TABLE user_reputation (
  pubkey TEXT NOT NULL,
  community_id TEXT NOT NULL REFERENCES cached_communities(id),
  reputation INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  approved_post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pubkey, community_id)
);
```

## Data Flow

### Event Creation Flow

1. User action triggers event creation (e.g., creating a post)
2. Application creates event object with appropriate kind and tags
3. Event is signed with user's private key (or via extension)
4. Event is published to Nostr relay
5. Application updates local state optimistically
6. On confirmation from relay, state is updated with actual event ID

### Event Consumption Flow

1. Application subscribes to relevant events based on current view
2. Events are received from relay
3. Events are normalized into application data models
4. Normalized data is stored in Redux state
5. UI components render based on normalized data
6. Additional data (e.g., author profiles) is fetched as needed

### Caching Flow

1. Frequently accessed data is cached in local storage
2. Popular content is cached in Supabase
3. Application checks cache before fetching from relay
4. Cache is updated when new data is received
5. Cache is invalidated based on time or relevant events

## Data Relationships

### Community Relationships

- Community ↔ Creator (1:1)
- Community ↔ Moderators (1:N)
- Community ↔ Posts (1:N)
- Community ↔ Subscribers (1:N)

### Post Relationships

- Post ↔ Author (1:1)
- Post ↔ Community (1:1)
- Post ↔ Comments (1:N)
- Post ↔ Votes (1:N)
- Post ↔ Tips (1:N)

### Comment Relationships

- Comment ↔ Author (1:1)
- Comment ↔ Post (1:1)
- Comment ↔ Parent Comment (N:1)
- Comment ↔ Child Comments (1:N)
- Comment ↔ Votes (1:N)
- Comment ↔ Tips (1:N)

### User Relationships

- User ↔ Posts (1:N)
- User ↔ Comments (1:N)
- User ↔ Votes (1:N)
- User ↔ Tips (1:N)
- User ↔ Subscriptions (1:N)
- User ↔ Moderation Actions (1:N)

## Conclusion

This document outlines the data models used throughout the Xeadline application. By understanding these models and their relationships, developers can effectively work with the application's data layer and ensure consistency across different components.

The data models are designed to efficiently represent the core entities of the application (users, communities, posts, comments) while leveraging the Nostr protocol's event-based architecture. The normalization strategies and caching mechanisms help ensure good performance despite the decentralized nature of the underlying protocol.
