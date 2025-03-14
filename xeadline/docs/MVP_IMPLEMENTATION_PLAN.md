# Xeadline MVP Implementation Plan

## Overview

This document outlines the implementation plan for Xeadline's Minimum Viable Product (MVP) - a decentralized Reddit alternative built on Nostr and Lightning. The plan breaks down the development into bite-sized, testable chunks with clear acceptance criteria for each feature.

## Tech Stack

- **Framework**: Next.js
- **State Management**: Redux Toolkit
- **Styling**: TailwindCSS
- **Nostr Relay**: wss://relay.xeadline.com (shared with xeadline-news)
- **Primary Color**: Bottle Green (#006a4e)

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Project Setup & Configuration

**Description**: Initialize the project with the necessary dependencies and configuration.

**Tasks**:

- Set up Next.js project with TypeScript
- Configure TailwindCSS with bottle green theme
- Set up Redux Toolkit
- Configure ESLint and Prettier
- Set up testing framework (Jest + React Testing Library)
- Create basic folder structure

**Acceptance Criteria**:

- ✅ Project builds without errors
- ✅ TailwindCSS is configured with bottle green (#006a4e) as primary color
- ✅ Redux store is initialized
- ✅ Basic component can be rendered

**Testing Approach**:

- Run build and lint commands
- Visual verification of color scheme
- Simple unit test for Redux store

### 1.2 Nostr Connection & Configuration

**Description**: Establish connection to the Nostr relay and implement basic event handling.

**Tasks**:

- Implement Nostr relay connection service
- Create event subscription manager
- Set up event publishing functionality
- Implement connection status indicators

**Acceptance Criteria**:

- ✅ Application successfully connects to wss://relay.xeadline.com
- ✅ Connection status is visually indicated to users
- ✅ Basic events can be published and subscribed to
- ✅ Connection errors are properly handled and displayed

**Testing Approach**:

- Manual testing of connection to relay
- Unit tests for connection service
- Visual verification of connection status indicator

### 1.3 Basic Layout & Navigation

**Description**: Create the core layout and navigation structure for the application.

**Tasks**:

- Implement responsive layout with sidebar, main content, and right sidebar
- Create navigation header with logo and search
- Implement mobile-responsive design
- Create placeholder pages for main routes

**Acceptance Criteria**:

- ✅ Layout matches Reddit's structure but with bottle green theme
- ✅ Navigation is functional across all placeholder pages
- ✅ Layout is responsive and works on mobile devices
- ✅ Sidebar collapses appropriately on smaller screens

**Testing Approach**:

- Visual comparison with Reddit layout
- Manual testing across different screen sizes
- Automated tests for navigation functionality

## Phase 2: Authentication & User Management (Weeks 3-4)

### 2.1 User Authentication

**Description**: Implement Nostr-based authentication system with multiple login options.

**Tasks**:

- Create key generation flow for new users
- Implement private key login with encryption
- Add support for nos2x and other Nostr extensions
- Implement nsec key paste functionality
- Create session management

**Acceptance Criteria**:

- ✅ New users can generate keys securely
- ✅ Users can log in with encrypted private keys
- ✅ nos2x extension is detected and used if available
- ✅ Users can paste nsec keys to log in
- ✅ Login state persists across page refreshes
- ✅ Private keys are properly encrypted in storage

**Testing Approach**:

- End-to-end testing of authentication flows
- Security audit of key storage
- Manual testing with nos2x extension
- Unit tests for encryption/decryption

### 2.2 User Profiles

**Description**: Create user profile functionality with Nostr integration.

**Tasks**:

- Implement profile page with user information
- Create profile editing functionality
- Add NIP-05 verification support
  - Display verification status for existing NIP-05 identifiers
  - Plan for future custom username@xeadline.com verification
- Implement avatar/image upload
- Create user activity feed

**Acceptance Criteria**:

- ✅ User profiles display relevant information from Nostr
- ✅ Users can edit their profiles
- ✅ NIP-05 verification status is displayed
- ✅ Profile images can be uploaded and displayed
- ✅ Activity feed shows user's posts and comments

**Testing Approach**:

- Manual testing of profile editing
- Visual verification of profile display
- Integration tests for NIP-05 verification
- Image upload functionality tests

**Future Implementation Notes**:

- **Image Storage**: For the MVP, profile pictures and banner images will be stored as data URLs directly in Nostr metadata. In the production version, these will be migrated to Supabase Storage:
  - Create a dedicated public bucket for profile images
  - Implement secure upload with proper permissions
  - Store only image URLs in Nostr metadata instead of full data URLs
  - Add image optimization and resizing before upload
  - Implement proper cleanup of old/unused images

- **Custom NIP-05 Verification**: For the post-MVP version, implement custom username@xeadline.com identifiers:
  - Create a database table for storing username-to-pubkey mappings
  - Implement the /.well-known/nostr.json endpoint for verification
  - Add username claiming and management in profile settings
  - Implement username availability checking
  - Create policies for username disputes and reserved names
  - Display verified usernames prominently in the UI
  - See detailed implementation plan in NIP05_IMPLEMENTATION_PLAN.md

### 2.3 User Settings

**Description**: Implement user preferences and settings.

**Tasks**:

- ✅ Create settings page with theme options
- ✅ Implement content filtering preferences
- ✅ Add notification settings
- ✅ Create account security settings
- Add custom NIP-05 verification (username@xeadline.com)

**Acceptance Criteria**:

- ✅ Users can toggle between light/dark mode
- ✅ Content filtering preferences are saved and applied
- ✅ Notification settings can be configured
- ✅ Security settings allow changing password for encrypted keys
- Users can claim and verify unique usernames on the xeadline.com domain

**Testing Approach**:

- Visual verification of theme switching
- Functional testing of preference saving
- Unit tests for settings application
- Verification of NIP-05 username claiming and verification

**Implementation Notes**:

- Created a comprehensive settings page with multiple tabs for different setting categories
- Implemented theme switching with light, dark, and system options
- Added content filtering preferences in the Privacy Settings tab
- Created notification settings for different notification types and channels
- Implemented security settings for password management and key export
- Added account settings for managing user information and connected accounts
- Created profile settings for customizing user profiles
- Used localStorage for settings persistence in the MVP
- Implemented auto-generated Robohash avatars for users without profile pictures:
  - Created utility functions for generating deterministic avatars based on public keys
  - Added option to reset to the auto-generated avatar in profile settings
  - Integrated with the profile picture upload workflow
  - Updated profile components to display Robohash avatars instead of generic user icons
  - Enhanced user experience with unique, personalized avatars for each user
  - Added Robohash avatars to the header user menu for consistent user identity across the platform

**NIP-05 Implementation**:

- Create a database table for storing username-to-pubkey mappings:
  ```sql
  CREATE TABLE nip05_usernames (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    pubkey VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```

- Implement the /.well-known/nostr.json endpoint:
  ```javascript
  // Example implementation using Next.js API route
  export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    let query = 'SELECT username, pubkey FROM nip05_usernames';
    let params = [];
    
    if (name) {
      query += ' WHERE username = $1';
      params.push(name);
    }
    
    const users = await db.query(query, params);
    
    const response = {
      names: {}
    };
    
    users.forEach(user => {
      response.names[user.username] = user.pubkey;
    });
    
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=300' // Cache for 5 minutes
      }
    });
  }
  ```

- Add username management to profile settings:
  - Username availability checking
  - Username claiming with validation
  - Display of current NIP-05 identifier

- Update profile display to show verified usernames:
  - Add verification badge next to username
  - Show full NIP-05 identifier (username@xeadline.com)

## Phase 3: Community System (Weeks 5-6)

### 3.1 Community Creation & Management

**Description**: Implement the community (subreddit equivalent) system using NIP-72.

**Tasks**:

- Create community creation form
- Implement community settings and rules
- Add moderation options configuration
- Create community discovery page

**Acceptance Criteria**:

- ✅ Users can create new communities with custom rules
- ✅ Community settings include flexible moderation options
- ✅ Communities are properly tagged with NIP-72 format
- ✅ Community discovery page shows trending and new communities
- ✅ Community pages display relevant information and rules

**Testing Approach**:

- End-to-end testing of community creation
- Verification of NIP-72 event format
- Visual testing of community pages
- Functional testing of moderation settings

### 3.2 Community Subscription

**Description**: Allow users to subscribe to communities and customize their feed.

**Tasks**:

- Implement subscribe/unsubscribe functionality
- Create personalized feed based on subscriptions
- Add community sidebar with subscription status
- Implement subscription management page

**Acceptance Criteria**:

- ✅ Users can subscribe and unsubscribe from communities
- ✅ Home feed shows content from subscribed communities
- ✅ Subscription status is clearly indicated on community pages
- ✅ Users can manage all their subscriptions from a central page

**Testing Approach**:

- Functional testing of subscription actions
- Visual verification of subscription indicators
- Integration tests for feed personalization

### 3.3 Moderation Tools

**Description**: Create basic moderation tools for community management.

**Tasks**:

- Implement post removal functionality
- Create moderator assignment system
- Add rule violation reporting
- Implement moderation logs

**Acceptance Criteria**:

- ✅ Moderators can remove posts that violate rules
- ✅ Community creators can assign and remove moderators
- ✅ Users can report content for rule violations
- ✅ Moderation actions are logged and visible to moderators

**Testing Approach**:

- Role-based testing of moderation actions
- Functional testing of reporting system
- Visual verification of moderation logs

## Phase 4: Content Creation & Interaction (Weeks 7-8)

### 4.1 Post Creation

**Description**: Implement post creation functionality with rich text support.

**Tasks**:

- Create post editor with rich text capabilities
- Implement image upload and embedding
- Add community selection
- Create post preview functionality
- Implement tagging system

**Acceptance Criteria**:

- ✅ Users can create posts with formatted text
- ✅ Images can be uploaded and embedded in posts
- ✅ Posts are properly associated with selected communities
- ✅ Preview shows how post will appear before submission
- ✅ Posts can be tagged for better categorization

**Testing Approach**:

- Functional testing of post editor
- Image upload testing
- Visual verification of post preview
- Integration testing with Nostr events

### 4.2 Commenting System

**Description**: Create nested comment functionality with threading.

**Tasks**:

- Implement comment creation
- Create nested reply system
- Add comment sorting options
- Implement comment collapse functionality
- Add comment editing and deletion

**Acceptance Criteria**:

- ✅ Users can comment on posts and reply to other comments
- ✅ Comments are displayed in a nested, threaded format
- ✅ Comments can be sorted by different criteria
- ✅ Comment threads can be collapsed and expanded
- ✅ Users can edit or delete their own comments

**Testing Approach**:

- Functional testing of comment creation and replies
- Visual verification of threading display
- User testing of comment navigation
- Performance testing with large comment threads

### 4.3 Voting System

**Description**: Implement upvote/downvote functionality using Nostr reactions.

**Tasks**:

- Create upvote/downvote UI components
- Implement vote counting and aggregation
- Add vote status persistence
- Create sorting based on vote counts

**Acceptance Criteria**:

- ✅ Users can upvote and downvote posts and comments
- ✅ Vote counts are accurately displayed and updated in real-time
- ✅ User's own vote status is persisted and indicated
- ✅ Content can be sorted by vote count (Hot, Top, etc.)
- ✅ Voting uses Nostr NIP-25 reaction events

**Testing Approach**:

- Functional testing of voting actions
- Visual verification of vote indicators
- Integration testing with Nostr events
- Performance testing of vote aggregation

## Phase 5: Lightning Integration & Performance (Weeks 9-10)

### 5.1 Basic Lightning Integration

**Description**: Implement Lightning Network functionality for anti-spam and tipping.

**Tasks**:

- Integrate WebLN for browser wallet support
- Implement tipping functionality for content
- Create anti-spam payment requirements for new accounts
- Add Lightning wallet connection status

**Acceptance Criteria**:

- ✅ Users can connect Lightning wallets via WebLN
- ✅ Content can be tipped with Lightning payments
- ✅ New accounts may require small Lightning payments to post
- ✅ Wallet connection status is clearly indicated

**Testing Approach**:

- Manual testing with Lightning wallets
- Functional testing of tipping flow
- Integration testing of anti-spam measures
- Visual verification of wallet status indicators

**Implementation Notes**:

- The relay (wss://relay.xeadline.com) does not need to run a Lightning node
- Users will connect their own Lightning wallets via WebLN
- Zap functionality will follow NIP-57 specification
- See detailed explanation in LIGHTNING_INTEGRATION.md

### 5.2 Caching & Performance Optimization

**Description**: Implement caching strategies for improved performance.

**Tasks**:

- Set up client-side caching for frequently accessed content
- Implement efficient Nostr subscription filtering
- Add lazy loading for media content
- Create optimized feed loading

**Acceptance Criteria**:

- ✅ Application feels responsive even with large amounts of content
- ✅ Media loads efficiently with appropriate lazy loading
- ✅ Nostr subscriptions are optimized to minimize data transfer
- ✅ Frequently accessed content loads instantly from cache

**Testing Approach**:

- Performance benchmarking
- Load testing with large datasets
- Visual verification of lazy loading
- User experience testing for responsiveness

### 5.3 Search Functionality

**Description**: Implement search capabilities for content and communities.

**Tasks**:

- Create search interface
- Implement community search
- Add post content search
- Create user search functionality

**Acceptance Criteria**:

- ✅ Users can search for communities by name and description
- ✅ Post content can be searched with relevant results
- ✅ Users can be found by username or NIP-05 identifier
- ✅ Search results are displayed in a clear, organized manner

**Testing Approach**:

- Functional testing of search queries
- Performance testing with large datasets
- User testing of search result relevance
- Visual verification of search result display

## Phase 6: Polish & Launch Preparation (Weeks 11-12)

### 6.1 UI/UX Refinement

**Description**: Polish the user interface and experience.

**Tasks**:

- Refine color scheme and visual elements
- Improve responsive design
- Add animations and transitions
- Implement dark/light mode
- Conduct usability testing

**Acceptance Criteria**:

- ✅ UI is visually appealing with bottle green (#006a4e) theme
- ✅ Application is fully responsive across all device sizes
- ✅ Animations enhance user experience without being distracting
- ✅ Dark/light mode works correctly across all components
- ✅ Usability issues identified in testing are addressed

**Testing Approach**:

- Visual inspection across devices
- User testing sessions
- Accessibility testing
- Cross-browser compatibility testing

### 6.2 Onboarding Experience

**Description**: Create smooth onboarding for new users.

**Tasks**:

- Design welcome screens
- Create guided tour functionality
- Implement progressive disclosure of features
- Add helpful tooltips and documentation

**Acceptance Criteria**:

- ✅ New users receive clear guidance on getting started
- ✅ Complex features are explained with contextual help
- ✅ Tooltips provide helpful information without being intrusive
- ✅ Documentation is accessible and comprehensive

**Testing Approach**:

- User testing with new users
- Functional testing of guided tour
- Visual verification of tooltips and help elements

### 6.3 Error Handling & Reliability

**Description**: Improve error handling and application reliability.

**Tasks**:

- Implement comprehensive error handling
- Add offline support capabilities
- Create error reporting system
- Implement recovery mechanisms

**Acceptance Criteria**:

- ✅ Errors are handled gracefully with user-friendly messages
- ✅ Application provides useful functionality even when offline
- ✅ Users can report errors they encounter
- ✅ Application can recover from common failure scenarios

**Testing Approach**:

- Chaos testing (deliberately introducing failures)
- Offline testing
- Error reporting flow testing
- Recovery scenario testing

## Testing Strategy

### Visual Testing

- Compare implementation against Reddit's UI with bottle green theme
- Verify responsive design across different device sizes
- Ensure consistent styling throughout the application

### Functional Testing

- Test each feature against its acceptance criteria
- Verify Nostr event creation and processing
- Test Lightning Network integration

### Performance Testing

- Measure and optimize load times
- Test with large datasets (many posts, comments)
- Verify caching effectiveness

### User Testing

- Conduct usability sessions with test users
- Gather feedback on UI/UX
- Identify pain points and areas for improvement

## Deployment Plan

### 1. Development Environment

- Set up CI/CD pipeline
- Configure staging environment
- Implement automated testing

### 2. Beta Release

- Deploy to limited user group
- Gather feedback and metrics
- Fix critical issues

### 3. Public Launch

- Deploy to production
- Monitor performance and user engagement
- Respond to initial feedback

## Success Metrics

- **User Engagement**: Average session duration, posts per user
- **Performance**: Page load times, time to interactive
- **Reliability**: Error rates, successful Nostr event rate
- **Growth**: New user registration, community creation rate

## Conclusion

This MVP implementation plan provides a structured approach to building Xeadline as a decentralized Reddit alternative. By breaking down the development into bite-sized, testable chunks with clear acceptance criteria, we ensure a methodical and quality-focused development process.

The plan prioritizes core Reddit-like functionality while leveraging the unique capabilities of Nostr and Lightning Network. Each phase builds upon the previous one, creating a solid foundation before adding more complex features.
