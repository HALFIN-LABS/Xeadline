# Xeadline UI Design Specification

## Overview

This document outlines the UI design specifications for Xeadline, a decentralized Reddit alternative. The design will maintain Reddit's familiar layout and user experience while implementing a bottle green color scheme and incorporating Nostr and Lightning Network elements.

## Color Palette

### Primary Colors

- **Bottle Green (Primary Brand Color)**: #006a4e

  - Replaces Reddit's orange (#FF4500)
  - Used for primary buttons, active states, and brand elements

- **Dark Bottle Green (Secondary Brand Color)**: #004d38

  - Used for hover states and secondary elements
  - Provides depth to the primary green

- **Light Bottle Green (Tertiary Brand Color)**: #00916d
  - Used for highlights and success states
  - Provides contrast against darker elements

### Neutral Colors

- **White**: #FFFFFF

  - Background color for light mode
  - Text color for dark elements

- **Off-White**: #F8F9FA

  - Secondary background for light mode
  - Used for cards and containers

- **Light Gray**: #E5E5E5

  - Borders and dividers
  - Disabled state backgrounds

- **Medium Gray**: #9CA3AF

  - Secondary text
  - Inactive elements

- **Dark Gray**: #4B5563

  - Primary text in light mode
  - Secondary elements in dark mode

- **Near Black**: #1F2937
  - Primary background for dark mode
  - High contrast text in light mode

### Functional Colors

- **Success Green**: #10B981

  - Positive actions and confirmations
  - Upvote indicators when active

- **Warning Yellow**: #F59E0B

  - Caution states and warnings
  - Moderator actions

- **Error Red**: #EF4444

  - Error states and destructive actions
  - Downvote indicators when active

- **Info Blue**: #3B82F6
  - Informational elements
  - Links and references

## Typography

### Font Family

- **Primary Font**: Inter

  - Clean, modern sans-serif font with excellent readability
  - Available on Google Fonts and easy to implement

- **Monospace Font**: JetBrains Mono
  - Used for code blocks and technical content
  - Clear distinction between similar characters

### Font Sizes

- **Heading 1**: 24px (1.5rem)

  - Used for main page titles

- **Heading 2**: 20px (1.25rem)

  - Used for section headings and post titles

- **Heading 3**: 18px (1.125rem)

  - Used for card headings and subsections

- **Body Text**: 16px (1rem)

  - Default text size for content

- **Small Text**: 14px (0.875rem)

  - Used for metadata, timestamps, and secondary information

- **Extra Small Text**: 12px (0.75rem)
  - Used for labels, badges, and tertiary information

### Font Weights

- **Regular**: 400

  - Default for body text

- **Medium**: 500

  - Used for emphasis and subheadings

- **Semi-Bold**: 600

  - Used for headings and important elements

- **Bold**: 700
  - Used for primary buttons and strong emphasis

## Component Design

### Buttons

#### Primary Button

- Background: Bottle Green (#006a4e)
- Text: White (#FFFFFF)
- Border: None
- Border Radius: 4px
- Padding: 8px 16px
- Hover State: Dark Bottle Green (#004d38)
- Active State: Darker shade (#003d2b)
- Disabled State: Light Gray background with Medium Gray text

#### Secondary Button

- Background: Transparent
- Text: Bottle Green (#006a4e)
- Border: 1px solid Bottle Green
- Border Radius: 4px
- Padding: 8px 16px
- Hover State: Light green background (#e6f7f2)
- Active State: Slightly darker background
- Disabled State: Light Gray border with Medium Gray text

#### Text Button

- Background: Transparent
- Text: Bottle Green (#006a4e)
- Border: None
- Padding: 8px 16px
- Hover State: Light green background (#e6f7f2)
- Active State: Slightly darker background
- Disabled State: Medium Gray text

### Cards

#### Post Card

- Background: White (#FFFFFF) in light mode, Dark Gray (#2D3748) in dark mode
- Border: 1px solid Light Gray (#E5E5E5) in light mode, 1px solid #4A5568 in dark mode
- Border Radius: 4px
- Box Shadow: Subtle shadow for depth
- Padding: 16px
- Hover State: Slight background change and shadow increase

#### Community Card

- Similar to Post Card but with community banner at top
- Community icon displayed prominently
- Member count and description included
- Join/Leave button in top right

### Navigation

#### Top Navigation Bar

- Background: White (#FFFFFF) in light mode, Near Black (#1F2937) in dark mode
- Height: 56px
- Logo: Xeadline logo in Bottle Green
- Search Bar: Centered, with rounded corners
- User Menu: Right-aligned with profile picture

#### Left Sidebar

- Background: Off-White (#F8F9FA) in light mode, Dark Gray (#2D3748) in dark mode
- Width: 240px (collapsible on mobile)
- Contains: Home, Popular, Communities list, Create Post button
- Create Post Button: Primary Button style
- Active Item: Highlighted with Bottle Green left border

#### Right Sidebar

- Background: Off-White (#F8F9FA) in light mode, Dark Gray (#2D3748) in dark mode
- Width: 300px (hidden on mobile)
- Contains: Community information, rules, moderators, related communities

### Voting UI

#### Upvote/Downvote Buttons

- Default State: Medium Gray (#9CA3AF)
- Upvoted State: Success Green (#10B981)
- Downvoted State: Error Red (#EF4444)
- Animation: Subtle scale animation on click

### Comments

#### Comment Thread

- Indentation: 24px per level
- Connector Lines: Light Gray vertical lines connecting comments
- Collapse Button: Small button to collapse/expand threads
- Reply Button: Text Button style

#### Comment Box

- Background: Slightly different from main background
- Border: 1px solid Light Gray
- Border Radius: 4px
- Focus State: Border color changes to Bottle Green

### Forms

#### Input Fields

- Height: 40px
- Border: 1px solid Light Gray
- Border Radius: 4px
- Focus State: Border color changes to Bottle Green
- Error State: Border color changes to Error Red
- Placeholder: Medium Gray text

#### Checkboxes and Radio Buttons

- Checked State: Bottle Green fill
- Border: 1px solid Light Gray when unchecked
- Size: 18px × 18px

#### Dropdowns

- Similar to Input Fields
- Dropdown Icon: Custom chevron in Bottle Green
- Options Menu: White background with hover states

### Modals

#### Standard Modal

- Background: White (#FFFFFF) in light mode, Dark Gray (#2D3748) in dark mode
- Border Radius: 8px
- Box Shadow: Prominent shadow for focus
- Header: Bold title with close button
- Footer: Action buttons (Primary and Secondary)

#### Lightning Payment Modal

- Similar to Standard Modal
- Includes QR code display
- Payment amount in large, bold text
- Lightning bolt icon in Bottle Green

## Page Layouts

### Home Page

```
+----------------------------------+
| [Nav Bar]                        |
+----------------------------------+
| [Left    |  [Main Content]  | [Right  |
| Sidebar] |                  | Sidebar]|
|          |  - Sort Options  |         |
|          |  - Post Cards    |         |
|          |                  |         |
|          |                  |         |
|          |                  |         |
+----------------------------------+
```

### Community Page

```
+----------------------------------+
| [Nav Bar]                        |
+----------------------------------+
| [Community Banner]               |
+----------------------------------+
| [Left    |  [Main Content]  | [Right  |
| Sidebar] |                  | Sidebar]|
|          |  - Community     |  - About|
|          |    Header        |  - Rules|
|          |  - Create Post   |  - Mods |
|          |  - Sort Options  |         |
|          |  - Post Cards    |         |
+----------------------------------+
```

### Post Detail Page

```
+----------------------------------+
| [Nav Bar]                        |
+----------------------------------+
| [Left    |  [Post Content]   | [Right  |
| Sidebar] |                   | Sidebar]|
|          |  [Comments]       |         |
|          |  - Comment Box    |         |
|          |  - Comment Threads|         |
|          |                   |         |
+----------------------------------+
```

### Profile Page

```
+----------------------------------+
| [Nav Bar]                        |
+----------------------------------+
| [User Banner]                    |
+----------------------------------+
| [Left    |  [User Info]      | [Right  |
| Sidebar] |                   | Sidebar]|
|          |  [Content Tabs]   |         |
|          |  - Posts          |         |
|          |  - Comments       |         |
|          |  - About          |         |
+----------------------------------+
```

## Responsive Design

### Breakpoints

- **Mobile**: < 640px

  - Single column layout
  - Hidden sidebars (available via menu)
  - Simplified navigation

- **Tablet**: 640px - 1024px

  - Two column layout (main content and right sidebar)
  - Collapsible left sidebar
  - Condensed navigation

- **Desktop**: > 1024px
  - Three column layout (full design)
  - Expanded navigation
  - All features visible

### Mobile Adaptations

- Navigation becomes bottom bar with icons
- Voting buttons increase in size for touch targets
- Comment indentation reduced
- Modal width adapts to screen size

## Iconography

### Custom Icons

- **Upvote/Downvote**: Custom arrows in Bottle Green
- **Lightning**: Custom lightning bolt for tipping features
- **Nostr**: Subtle Nostr logo integration where appropriate

### System Icons

- Using Heroicons library for consistency
- Line weight: 1.5px for regular icons
- Size: 24px for navigation, 20px for inline, 16px for small contexts

## Animation & Transitions

### Micro-interactions

- Button hover/active states: 150ms transition
- Voting animation: Subtle scale and color change
- Comment collapse: Smooth height transition

### Page Transitions

- Subtle fade for page changes
- Content loading states with skeleton screens

## Accessibility

### Color Contrast

- All text meets WCAG AA standards for contrast
- Interactive elements have distinct focus states

### Dark Mode

- True dark mode (not just inverted colors)
- Reduced brightness for comfortable nighttime viewing
- Maintains brand colors but adjusts for dark backgrounds

### Focus States

- Clearly visible focus indicators
- Tab navigation fully supported
- Skip-to-content link for keyboard users

## Lightning Network Integration

### Tipping UI

- Lightning bolt icon next to content
- Tipping modal with amount selection
- QR code display for wallet connection
- Success/failure states with appropriate feedback

### Wallet Connection

- Wallet status indicator in user menu
- Connection flow with clear instructions
- Balance display (optional, user preference)

## Nostr-Specific Elements

### Event Indicators

- Subtle indicators for different Nostr event types
- Verification badges for NIP-05 verified users
- Relay connection status in footer or settings

### Key Management

- Secure key display with appropriate warnings
- Key generation flow with clear instructions
- Extension detection with seamless integration

## Implementation Guidelines

### CSS Approach

- TailwindCSS as primary styling method
- Custom utility classes for repeated patterns
- Component-specific styles when needed

### Component Hierarchy

- Atomic design approach:
  - Atoms: Buttons, inputs, icons
  - Molecules: Cards, comment threads, voting widgets
  - Organisms: Navigation bars, sidebars, feed sections
  - Templates: Page layouts
  - Pages: Complete screens

### Design Tokens

- Implement design tokens for colors, spacing, typography
- Use CSS variables for theme switching
- Maintain consistent naming convention

## Conclusion

This UI design specification provides a comprehensive guide for implementing Xeadline's visual design. By maintaining Reddit's familiar layout while implementing a distinctive bottle green color scheme, Xeadline will offer users a familiar yet fresh experience.

The design system prioritizes consistency, accessibility, and the integration of Nostr and Lightning Network elements, ensuring that Xeadline stands out as a modern, decentralized alternative to Reddit.
