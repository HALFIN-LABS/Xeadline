# Xeadline

A decentralized Reddit alternative built on Nostr and Lightning Network.

## Overview

Xeadline combines the community-focused design of Reddit with the censorship-resistance of Nostr and the economic capabilities of Bitcoin's Lightning Network. It provides a platform where users truly own their content, communities can establish their own governance, and creators can receive direct support through Lightning tips.

## Tech Stack

- **Framework**: Next.js
- **State Management**: Redux Toolkit
- **Styling**: TailwindCSS with bottle green (#006a4e) theme
- **Nostr Relay**: wss://relay.xeadline.com
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or later)
- npm (v8.0.0 or later) or yarn (v1.22.0 or later)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-organization/xeadline.git
cd xeadline
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
xeadline/
├── src/
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── redux/             # Redux state management
│   ├── services/          # Service layer (API, Nostr, etc.)
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── jest.config.js         # Jest configuration
├── next.config.js         # Next.js configuration
├── package.json           # Project dependencies
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run format` - Format code with Prettier

## Features

- **Community-Focused**: Create and join topic-based communities
- **Decentralized**: Built on the Nostr protocol for censorship resistance
- **User Ownership**: Control your identity and content with cryptographic keys
- **Direct Monetization**: Support content creators with Lightning tips
- **Flexible Moderation**: Communities choose their moderation approach
- **Modern UI**: Clean, responsive design with bottle green theme

## Documentation

For more detailed documentation, please refer to the [docs](../docs) directory.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE.md) file for details.
