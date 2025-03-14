# Xeadline Development Setup Guide

## Overview

This document provides step-by-step instructions for setting up the development environment for the Xeadline project. It covers all the necessary tools, dependencies, and configuration required to start developing the application.

## Prerequisites

Before starting, ensure you have the following installed on your system:

- **Node.js** (v18.0.0 or later)
- **npm** (v8.0.0 or later) or **yarn** (v1.22.0 or later)
- **Git** (v2.30.0 or later)
- A code editor (VS Code recommended)

## Installation Steps

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-organization/xeadline.git

# Navigate to the project directory
cd xeadline
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Nostr Relay
NEXT_PUBLIC_NOSTR_RELAY_URL=wss://relay.xeadline.com

# Supabase (for caching)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AWS S3 (for media storage)
NEXT_PUBLIC_AWS_REGION=your-aws-region
NEXT_PUBLIC_S3_BUCKET=your-s3-bucket
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=your-cloudfront-domain

# Development Settings
NEXT_PUBLIC_DEVELOPMENT_MODE=true
```

For local development without external services, you can use these placeholder values:

```
NEXT_PUBLIC_NOSTR_RELAY_URL=wss://relay.xeadline.com
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET=xeadline-dev
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=dev.xeadline.com
NEXT_PUBLIC_DEVELOPMENT_MODE=true
```

### 4. Start the Development Server

```bash
# Using npm
npm run dev

# Or using yarn
yarn dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## Project Structure

The Xeadline project follows a standard Next.js structure with some additional organization:

```
xeadline/
├── docs/                  # Project documentation
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   ├── community/     # Community-related components
│   │   ├── layout/        # Layout components
│   │   ├── post/          # Post-related components
│   │   ├── comment/       # Comment-related components
│   │   ├── user/          # User-related components
│   │   └── ui/            # Generic UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── services/          # Service layer (API, Nostr, etc.)
│   ├── redux/             # Redux state management
│   │   ├── slices/        # Redux slices
│   │   ├── hooks.ts       # Redux hooks
│   │   ├── store.ts       # Redux store configuration
│   │   └── provider.tsx   # Redux provider
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── .env.local             # Local environment variables
├── .eslintrc.json         # ESLint configuration
├── .gitignore             # Git ignore file
├── next.config.js         # Next.js configuration
├── package.json           # Project dependencies
├── postcss.config.js      # PostCSS configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Development Tools

### Recommended VS Code Extensions

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Autocomplete for Tailwind CSS
- **GitLens**: Git integration
- **Error Lens**: Inline error display

### Browser Extensions for Testing

- **nos2x**: Nostr signer extension for Chrome/Firefox
- **Alby**: Lightning wallet for testing payments

## Local Nostr Development

For local development, you can use a local Nostr relay instead of connecting to the production relay.

### Setting Up a Local Nostr Relay

1. Clone the Nostream repository:

```bash
git clone https://github.com/Cameri/nostream.git
cd nostream
```

2. Install dependencies:

```bash
npm install
```

3. Create a configuration file:

```bash
cp .env.example .env
```

4. Update the settings in `data/settings.json` to enable all required NIPs, especially NIP-72 for communities.

5. Start the relay:

```bash
npm start
```

6. Update your `.env.local` file to use the local relay:

```
NEXT_PUBLIC_NOSTR_RELAY_URL=ws://localhost:8008
```

### Testing with Multiple Identities

For testing features that require multiple users (like community moderation), you can create multiple test identities:

1. Generate test key pairs using the `nostr-tools` library:

```javascript
// scripts/generate-test-keys.js
const { generatePrivateKey, getPublicKey } = require('nostr-tools')

for (let i = 0; i < 5; i++) {
  const sk = generatePrivateKey()
  const pk = getPublicKey(sk)
  console.log(`User ${i + 1}:`)
  console.log(`Private key: ${sk}`)
  console.log(`Public key: ${pk}`)
  console.log('---')
}
```

2. Run the script:

```bash
node scripts/generate-test-keys.js
```

3. Use these keys to log in as different users during testing.

## Working with Lightning Network

For local development with Lightning Network features, you can use one of these approaches:

### Option 1: WebLN Emulator

1. Install the WebLN Emulator:

```bash
npm install webln-emulator --save-dev
```

2. Add the emulator to your development environment:

```javascript
// src/utils/webln-dev.js
import { EmulatorWebLNProvider } from 'webln-emulator'

if (process.env.NODE_ENV === 'development' && !window.webln) {
  window.webln = new EmulatorWebLNProvider()
}
```

3. Import this file in your application entry point (for development only).

### Option 2: Polar (Lightning Network in Regtest)

For more realistic testing:

1. Install [Polar](https://lightningpolar.com/)
2. Create a local Lightning Network with multiple nodes
3. Connect to these nodes using LND's REST API

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Testing Specific Components

```bash
# Test a specific file
npm test -- src/components/post/PostCard.test.tsx

# Test with a specific pattern
npm test -- -t "PostCard"
```

## Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Building for Production

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

## Debugging

### Redux DevTools

The application is configured to work with the [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools). Install the browser extension to debug the Redux state.

### React Developer Tools

Install the [React Developer Tools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html) browser extension for debugging React components.

### Logging

The application uses a custom logger that respects the environment:

```javascript
// src/utils/logger.js
export const logger = {
  debug: (...args) => {
    if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true') {
      console.debug('[Xeadline]', ...args)
    }
  },
  info: (...args) => console.info('[Xeadline]', ...args),
  warn: (...args) => console.warn('[Xeadline]', ...args),
  error: (...args) => console.error('[Xeadline]', ...args),
}
```

Use this logger instead of direct console methods for consistent logging that can be controlled by environment.

## Common Issues and Solutions

### Connection Issues with Nostr Relay

**Issue**: Unable to connect to the Nostr relay.

**Solution**:

- Check if the relay URL is correct in your `.env.local` file
- Ensure the relay is running if using a local relay
- Check browser console for specific error messages
- Try connecting to a public relay as a fallback

### WebLN Not Detected

**Issue**: Lightning features not working because WebLN is not detected.

**Solution**:

- Ensure you have a WebLN-compatible wallet extension installed
- Check if you're using the WebLN emulator in development
- Verify that the WebLN detection code is running before accessing WebLN features

### Type Errors in Development

**Issue**: TypeScript errors related to Nostr or other libraries.

**Solution**:

- Ensure you have the latest type definitions installed
- Check if you need to create custom type definitions for third-party libraries
- Run `npm install --save-dev @types/nostr-tools` if not already installed

## Contributing

### Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/feature-name`: Feature branches
- `bugfix/bug-description`: Bug fix branches

### Pull Request Process

1. Create a branch from `develop` for your feature or bugfix
2. Implement your changes with appropriate tests
3. Ensure all tests pass and linting is clean
4. Create a pull request to merge into `develop`
5. Request review from team members
6. Address any feedback
7. Merge once approved

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Examples:

- `feat(community): add community creation form`
- `fix(auth): resolve issue with key generation`
- `docs(readme): update development instructions`
- `style(ui): improve button styling`

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Nostr NIPs Repository](https://github.com/nostr-protocol/nips)
- [WebLN Specification](https://webln.dev/)

## Conclusion

This setup guide should help you get started with Xeadline development. If you encounter any issues not covered here, please refer to the project's issue tracker or contact the development team.

Remember that Xeadline is built on decentralized technologies (Nostr and Lightning Network), which may have their own learning curves. Take time to understand these protocols as you work on the application.
