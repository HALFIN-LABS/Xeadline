# Changelog

All notable changes to the Xeadline project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2025-03-14

### Fixed
- Fixed relay connection issue by prioritizing wss://relay.xeadline.com as the primary relay
- Fixed profile update functionality to properly sign events with encrypted private keys
- Fixed issue with profile updates not being reflected in the UI
- Enhanced Modal component with fixed footer for better accessibility of action buttons
- Fixed profile edit form submission by ensuring the save button is always visible
- Fixed inconsistency between profile images from different Nostr clients (Damus, Primal, etc.)
- Fixed "Failed to update profile" error when updating profile from Xeadline even though the update was successful on relays
- Fixed profile image in header to ensure it's properly cropped in a circle instead of being stretched
- Fixed Nostr extension connection status in settings to accurately reflect whether it's connected
- Fixed warning when connecting to Nostr extension while signed in with a private key
- Improved Nostr extension UI to clearly indicate when user is signed in with a private key
- Updated "Connect" button to show "Switch to Extension" when appropriate

### Enhanced
- Improved authentication service to store password in session for encrypted private key operations
- Enhanced profile service to properly decrypt and sign events when using encrypted private keys
- Added better error handling for profile update failures
- Improved profile synchronization to always use the most recent profile data based on timestamps
- Enhanced profile fetching to collect and sort metadata events by timestamp for consistency
- Added timestamp tracking to profile data for better caching and synchronization
- Improved profile update process to handle partial successes (when updates reach some relays but not others)
- Added button to reset profile picture to the robot avatar generated from the user's public key
- Simplified settings page by removing unused fields (username, email, language settings)
- Enhanced public key display in settings to toggle between hex and npub formats
- Added browser detection to show a compatibility notice for Safari users
- Created a dedicated Safari notice component with browser recommendations
- Improved user experience by clearly communicating browser requirements
- Removed duplicate profile settings section from the settings page
- Removed appearance settings tab completely
- Enforced dark mode as the only theme option
- Simplified the settings interface
- Enhanced connection status indicator with detailed relay information
- Added animated modal showing individual relay connection status
- Removed regenerate keys option from security settings

## [2.2.0] - 2025-03-13

### Added
- User profile functionality with Nostr integration
- Profile page displaying user information from Nostr
- Profile editing capabilities with image upload
- NIP-05 verification support and display
- User activity feed showing posts and reactions
- Redux slice for managing profile state

### Fixed
- Added wss://relay.xeadline.com as the primary relay in the Nostr connection service
- Removed password requirement from profile updates, now using extension or stored keys automatically
- Fixed display name not being saved correctly in profile updates (converted displayName to display_name for Nostr compatibility)
- Improved profile update experience by automatically refreshing profile data after successful updates

### Enhanced
- Improved NIP-05 verification process with immediate verification during profile updates
- Added detailed guidance for setting up NIP-05 verification in the profile edit form
- Added visual feedback during profile updates with button state changes
- Added generated display names for users without profiles based on their public keys
- Improved profile page experience for new users with a more welcoming interface
- Made modal component scrollable to better handle forms with detailed instructions
- Added visual scroll indicator and always-visible scrollbar for better usability
- Improved modal scrolling with forced scrollbar visibility and minimum content height
- Added sticky scroll indicator with gradient background for better visibility

### Added
- Comprehensive user settings page with multiple tabs:
  - Account settings for managing user information and connected accounts
  - Profile settings for customizing user profiles
  - Appearance settings with theme options (light/dark/system)
  - Notification settings for controlling email and push notifications
  - Privacy settings with content filtering preferences
  - Security settings for password management and two-factor authentication
- Auto-generated Robohash avatars for users without profile pictures:
  - Deterministic generation based on user's public key
  - Option to reset to the auto-generated avatar
  - Utility functions for avatar URL generation
  - Integrated with profile components to show unique avatars for each user
  - Replaced generic user icons with personalized robot avatars
  - Updated Next.js configuration to allow Robohash image domain
  - Added Robohash avatar to the header user menu for consistent user identity

### Added
- Custom NIP-05 verification (username@xeadline.com) for user profiles:
  - Allow users to claim unique usernames on the xeadline.com domain
  - Implement the /.well-known/nostr.json endpoint for verification
  - Add username management in profile settings
  - Display verified usernames prominently in the UI
- Documentation for Lightning Network integration:
  - Clarified that the relay does not need to run a Lightning node
  - Explained NIP-57 implementation approach using WebLN
  - Documented options for users to send and receive zaps

### Planned for Future Releases
- Migrate profile picture and banner image storage from data URLs to Supabase Storage
- Add proper cleanup of old/unused images

### Implemented from Planned Features
- Improved profile image handling to support images from any Nostr client:
  - Updated Next.js configuration to allow images from any domain using remotePatterns
  - Added robust image validation and fallback mechanisms
  - Implemented error handling for failed image loads
  - Created comprehensive image utilities for handling profile pictures from various sources
  - Added real-time profile synchronization to update profile pictures when changed on other clients
  - Fixed header avatar to use the actual profile picture instead of always showing Robohash

## [2.1.1] - 2025-03-13

### Fixed
- Fixed persistent "Passwords do not match" error message in signup form that remained even after correction
- Added password reveal functionality to all password fields in both signup and login forms

## [2.1.0] - 2025-03-13

### Added
- Nostr-based authentication system with multiple login options
- Key generation flow for new users with secure encryption
- Private key login with client-side encryption
- Support for nos2x and other Nostr extensions
- nsec key paste functionality for easy login
- Session management with persistence across page refreshes
- User profile dropdown menu in header
- Modal-based authentication UI with login and signup options
- Secure key storage using the Web Crypto API
- Redux slice for managing authentication state
- Private key backup functionality to prevent account loss
- Key export options (copy to clipboard and download as file)

### Changed
- Updated header to show login/signup buttons for non-authenticated users
- Added user profile dropdown for authenticated users
- Improved mobile menu with authentication-aware options
- Enhanced security with client-side encryption for private keys
- Implemented modal-based authentication for better user experience
- Added key backup step after account creation for data safety

## [1.3.0] - 2025-03-13

### Added
- Responsive layout with sidebar, main content, and right sidebar
- Navigation header with logo and search functionality
- Mobile-responsive design with collapsible sidebar
- Placeholder pages for main routes (Home, Popular, All, Settings)
- Post card components for displaying content with support for images and videos
- Topic navigation in sidebar with default topics (News, Technology, Bitcoin, Lightning, Nostr)
- Sticky filter bars that remain visible while scrolling

### Changed
- Updated application structure to match Reddit's layout with bottle-green theme
- Implemented vertically stacked post layout for better readability
- Made posts 30% less horizontally long and 25% vertically longer for improved aspect ratio
- Added minimum height to post cards for consistent sizing
- Removed page headings in favor of sticky filter bars
- Used "t/" prefix for topics to differentiate from Reddit's "r/" subreddits
- Updated home page to use the same filter options as the All page for non-logged-in users
- Moved footer links to the left sidebar with smaller font size
- Right sidebar now only appears on topic pages, not on main feed pages
- Improved mobile experience with responsive design
- Enhanced navigation between pages

## [1.2.0] - 2025-03-13

### Added
- Nostr relay connection service with support for wss://relay.xeadline.com
- Event subscription manager for Nostr events
- Event publishing functionality
- Connection status indicator component in bottom-left corner (desktop only)
- Redux slice for managing Nostr connection state
- Unit tests for Nostr connection service
- Automatic connection to Nostr relay on page load

### Changed
- Updated application layout to include Nostr connection status
- Added NostrInitializer component to handle connection initialization
- Positioned connection status indicator in bottom-left corner for desktop
- Hidden connection status indicator on mobile devices

## [1.1.0] - 2025-03-13

### Added
- Redux store configuration with TypeScript support
- Basic UI components including Button component with different variants and sizes
- Tailwind CSS integration with custom bottle-green color scheme
- Jest testing setup for components and Redux store

### Changed
- Updated project structure to follow Next.js 14 conventions
- Improved styling with Tailwind utility classes

### Fixed
- Formatting issues resolved with Prettier

## [1.0.0] - 2025-03-01

### Added
- Initial project setup with Next.js 14
- Basic project structure
- Documentation files