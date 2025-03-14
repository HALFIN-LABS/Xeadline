# Xeadline NIP Compliance

## Overview

This document reviews the Xeadline documentation for compliance with Nostr Implementation Possibilities (NIPs) and provides recommendations for ensuring consistency with the relevant NIPs. Proper NIP compliance is essential for interoperability with other Nostr clients and relays.

## Key NIPs for Xeadline

Xeadline relies on several NIPs for its core functionality:

1. **NIP-01**: Basic protocol flow description
2. **NIP-05**: Mapping Nostr keys to DNS identifiers
3. **NIP-09**: Event deletion
4. **NIP-10**: Thread replies
5. **NIP-19**: bech32-encoded entities
6. **NIP-25**: Reactions (for upvotes/downvotes)
7. **NIP-26**: Delegated event signing (for moderation)
8. **NIP-42**: Authentication of clients to relays
9. **NIP-72**: Moderated Communities (kind:34550)
10. **NIP-94**: File attachment

## Compliance Review

### NIP-01: Basic Protocol

**Status**: Compliant

The basic event structure and communication with relays follows NIP-01 specifications. All events include the required fields (id, pubkey, created_at, kind, tags, content, sig).

### NIP-05: Mapping Nostr Keys to DNS Identifiers

**Status**: Compliant

User profiles correctly include the nip05 field for verification, and the documentation mentions NIP-05 verification as part of the authentication system.

### NIP-10: Thread Replies

**Status**: Partially Compliant

**Current Implementation**:

```json
{
  "kind": 1,
  "tags": [
    ["e", "original-post-id", "", "root"],
    ["e", "parent-comment-id", "", "reply"]
  ]
}
```

**Recommendation**:
Ensure that the "e" tags include relay hints where possible, and that the ordering of "e" tags follows NIP-10 conventions (the event being replied to should be the last "e" tag).

### NIP-25: Reactions

**Status**: Partially Compliant

**Current Implementation**:

```json
{
  "kind": 7,
  "content": "+", // "+" for upvote, "-" for downvote
  "tags": [
    ["e", "post-or-comment-id"],
    ["client", "xeadline"],
    ["xd", "vote"]
  ]
}
```

**Recommendations**:

1. Include a "p" tag with the pubkey of the post/comment author (this is mentioned in DATA_MODELS.md but not shown in the example in TECHNICAL_ARCHITECTURE.md)
2. Include a "k" tag with the kind of the event being reacted to
3. Include a relay hint in the "e" tag

**Compliant Implementation**:

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

### NIP-72: Moderated Communities

**Status**: Partially Compliant

**Community Definition (kind:34550)**:
The community definition implementation is compliant with NIP-72, including the required "d" tag and optional "name" tag.

**Posting to Communities**:
The implementation correctly uses the "a" tag to reference communities.

**Moderation Actions (kind:4550)**:
The moderation action implementation is partially compliant.

**Current Implementation**:

```json
{
  "kind": 4550,
  "content": "Reason for moderation action",
  "tags": [
    ["e", "post-or-comment-id"],
    ["p", "content-author-pubkey"],
    ["a", "34550:pubkey:community-id"],
    ["action", "remove" | "approve"],
    ["client", "xeadline"],
    ["xd", "moderation"]
  ]
}
```

**Recommendations**:

1. Include the full JSON-stringified post event in the content field
2. Include a "k" tag with the original post's event kind
3. Remove the non-standard "action" tag and use the presence of the event to indicate approval (deletion can be handled via NIP-09)

**Compliant Implementation**:

```json
{
  "kind": 4550,
  "content": "{\"id\":\"post-id\",\"pubkey\":\"author-pubkey\",\"kind\":1,...}", // Full JSON-encoded post
  "tags": [
    ["a", "34550:pubkey:community-id", "wss://relay.xeadline.com"],
    ["e", "post-id", "wss://relay.xeadline.com"],
    ["p", "post-author-pubkey"],
    ["k", "1"], // Kind of the post being approved
    ["client", "xeadline"]
  ]
}
```

### Custom Event Kinds

Xeadline defines several custom event kinds that are not part of any NIP. This is acceptable for platform-specific functionality, but should be clearly documented as Xeadline extensions.

#### Community Subscription (kind:30001)

This is a Xeadline-specific event kind. The kind number 30001 falls within the addressable event range (30000-39999) as defined in NIP-01, which is appropriate for this use case.

#### Report (kind:1984)

This is a Xeadline-specific event kind. The kind number 1984 falls within the regular event range (1000-9999) as defined in NIP-01, which is appropriate for this use case.

#### Lightning Tip (kind:9735)

This is a Xeadline-specific event kind. The kind number 9735 falls within the regular event range (1000-9999) as defined in NIP-01, which is appropriate for this use case. The number 9735 is likely chosen as a reference to Lightning Network (port 9735).

## Recommendations for Documentation Updates

### 1. Update DATA_MODELS.md

#### Reaction/Vote (kind:7)

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

#### Moderation Action (kind:4550)

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

### 2. Update TECHNICAL_ARCHITECTURE.md

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

#### Moderation Action (kind:4550)

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

### 3. Add Documentation for Custom Event Kinds

Add a section to the TECHNICAL_ARCHITECTURE.md document that explicitly states which event kinds are Xeadline-specific extensions:

```markdown
## Xeadline-Specific Event Kinds

Xeadline defines several custom event kinds that extend the Nostr protocol for platform-specific functionality:

1. **Community Subscription (kind:30001)**: Used to track user subscriptions to communities
2. **Report (kind:1984)**: Used for reporting content that violates community rules
3. **Lightning Tip (kind:9735)**: Used for recording Lightning Network tips for content

These event kinds are not part of any NIP and may not be recognized by other Nostr clients. They follow the Nostr event structure and are processed by the Xeadline application.
```

## Conclusion

Overall, the Xeadline documentation demonstrates good compliance with the relevant NIPs, with a few areas that need minor updates to ensure full compliance. The custom event kinds are appropriately defined within the ranges specified by NIP-01 and serve the specific needs of the Xeadline platform.

By implementing the recommendations in this document, Xeadline will maintain better interoperability with other Nostr clients and relays while still providing its unique features and functionality.
