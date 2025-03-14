# Xeadline UI Components

## Overview

This document outlines the key UI components for the Xeadline application, focusing on the core user interactions: post creation, post viewing with comments, and profile configuration. These components are designed to provide a familiar Reddit-like experience while leveraging Xeadline's Nostr-based architecture.

## Post Creation Interface

The post creation interface allows users to create new posts within communities.

![Post Creation Interface Example](https://example.com/post-creation.png)

### Key Components

#### Header

- **Community Selector**: Dropdown to select the community where the post will be published
- **Create Post Title**: Clear heading indicating the user is creating a post

#### Content Input

- **Title Field**: Required field for the post title (maps to the "subject" tag in Nostr events)
- **Content Tabs**:
  - Text: For text-only posts
  - Images & Video: For media uploads
  - Link: For URL sharing
  - Poll: For creating polls

#### Content Editor

- **Rich Text Editor**: For formatting text content
- **Media Upload Area**: Drag and drop or file selection for images/videos
- **Tags Input**: For adding topic tags to the post

#### Community Rules

- **Rules Panel**: Displays the selected community's rules
- **Moderation Information**: Shows moderation type (pre-approval, post-publication)

#### Action Buttons

- **Save Draft**: Saves the post locally without publishing
- **Post**: Publishes the post to the selected community

### Implementation Notes

- The post creation form maps to a Nostr kind:1 event with community reference
- Community reference uses the "a" tag with format: `["a", "34550:pubkey:community-id"]`
- Title is stored in the "subject" tag
- Content is stored in the event content field
- Topic tags are stored as "t" tags
- Media references are stored as URLs in the content or as specific tags

## Post and Comments View

The post and comments view displays a post with its associated comments in a threaded format.

![Post and Comments View Example](https://example.com/post-comments.png)

### Key Components

#### Post Display

- **Vote Controls**: Upvote/downvote buttons with count
- **Post Header**: Title, author information, community, and timestamp
- **Post Content**: Text, images, or embedded media
- **Post Actions**: Comment, share, save, and tip buttons
- **Moderation Status**: Indicator if the post has been approved by moderators

#### Comment Creation

- **Comment Input**: Text field for adding a new comment
- **Rich Text Controls**: Basic formatting options for comments

#### Comment Thread

- **Comment Card**: Individual comment with author info and content
- **Comment Vote Controls**: Upvote/downvote buttons for each comment
- **Comment Actions**: Reply, share, report, and tip buttons
- **Nested Replies**: Visual indication of comment hierarchy
- **Collapsed Comments**: Ability to collapse comment threads
- **Load More**: Controls to load additional comments

### Implementation Notes

- Posts are displayed from Nostr kind:1 events with community tags
- Comments are also kind:1 events with references to the original post
- Comment threading uses the "e" tag with markers for root/reply relationships:
  - `["e", "original-post-id", "", "root"]` for top-level comments
  - `["e", "parent-comment-id", "", "reply"]` for replies to comments
- Votes are implemented as kind:7 events with "+" or "-" content
- The comment hierarchy is constructed client-side by analyzing the "e" tags

## User Profile Configuration

The user profile configuration interface allows users to set up and edit their Nostr profile information.

![User Profile Configuration Example](https://example.com/profile-config.png)

### Key Components

#### Profile Images

- **Profile Picture**: User's avatar image (circular)
- **Banner Image**: Background header image
- **Image Upload Controls**: Buttons to change profile and banner images

#### Basic Information

- **Name**: User's display name
- **Username**: Unique identifier (may be used for NIP-05 verification)
- **Website**: Optional URL to user's website
- **About Me**: Biographical information

#### Nostr Configuration

- **Lightning Address**: For receiving Lightning tips (LNURL or Lightning Address)
- **Nostr Address**: NIP-05 identifier (username@domain.com)

#### Additional Settings

- **Save Button**: Prominent button to save profile changes
- **Navigation**: Access to other profile-related settings

### Implementation Notes

- Profile information is stored in a Nostr kind:0 metadata event
- The content field contains a JSON object with profile data:
  ```json
  {
    "name": "Display Name",
    "displayName": "Display Name",
    "about": "Biographical information",
    "picture": "https://example.com/avatar.jpg",
    "banner": "https://example.com/banner.jpg",
    "website": "https://example.com",
    "nip05": "username@domain.com",
    "lud16": "lightning@address.com"
  }
  ```
- NIP-05 verification status is displayed when verified
- Lightning address enables tipping functionality throughout the application

## Common UI Elements

### Navigation

- **Home**: Access to the main feed
- **Communities**: List of subscribed communities
- **Notifications**: Access to user notifications
- **Profile**: Access to user profile and settings
- **Search**: Global search functionality

### Community Card

- **Community Name**: Display name of the community
- **Member Count**: Number of subscribers
- **Description**: Brief community description
- **Subscribe Button**: Toggle for joining/leaving communities

### User Card

- **Username**: User's display name
- **Verification Badge**: Indicator for NIP-05 verified users
- **Profile Picture**: User's avatar
- **Follow Button**: Toggle for following users

### Moderation Tools

- **Report Button**: For flagging inappropriate content
- **Moderation Queue**: For community moderators to review content
- **Approval Controls**: For approving or removing content

## Xeadline-Specific UI Elements

### Lightning Integration

- **Tip Button**: Present on posts and comments for sending Lightning tips
- **Tip Amount Selector**: Interface for selecting tip amount
- **Payment Status**: Indicator for payment processing/completion

### Nostr Verification

- **NIP-05 Badge**: Visual indicator of verified Nostr identities
- **Relay Status**: Indicator of connection status to Nostr relays
- **Event Signing**: Interface for signing events with Nostr keys

### Decentralized Features

- **Relay Selector**: Interface for choosing preferred Nostr relays
- **Key Management**: Controls for managing Nostr keys
- **Extension Integration**: Interface for connecting with Nostr browser extensions

## Mobile Considerations

The UI components should be responsive and adapt to mobile screen sizes:

- **Simplified Navigation**: Condensed menu for mobile devices
- **Touch-Friendly Controls**: Larger touch targets for mobile interaction
- **Efficient Space Usage**: Collapsible elements to maximize content area
- **Bottom Navigation**: Easy thumb access to key functions

## Accessibility Considerations

All UI components should follow accessibility best practices:

- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Sufficient contrast for text and interactive elements
- **Text Sizing**: Support for text resizing without breaking layouts
- **Focus Indicators**: Clear visual indication of focused elements

## Design System Integration

These components should be implemented according to the design system defined in the UI_DESIGN_SPECIFICATION.md document, using the bottle green color theme and consistent typography.

## Implementation Approach

1. **Component Library**: Develop reusable React components for each UI element
2. **Responsive Design**: Implement mobile-first approach with responsive breakpoints
3. **Progressive Enhancement**: Ensure basic functionality works without JavaScript
4. **Performance Optimization**: Lazy load components and optimize for initial load time
5. **Accessibility Testing**: Regularly test with screen readers and keyboard navigation

## Next Steps

1. Create detailed wireframes for each component
2. Develop component prototypes in Storybook
3. Implement core components in React
4. Integrate with Nostr event handling
5. Test with users and iterate based on feedback
