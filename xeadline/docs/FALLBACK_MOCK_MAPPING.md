# Fallback and Mock Implementation Mapping

This document maps out all the places in the codebase where we're using fallbacks, mock data, or anything that isn't properly connected to our external services (Nostr relays, Supabase, or the internet).

## Disabled Components

### 1. NostrInitializer Component
- **File**: `src/app/layout.tsx`
- **Status**: Temporarily disabled
- **Description**: This component initializes the Nostr connection and profile synchronization. It's currently commented out to prevent client-side errors.
- **Impact**: Without this component, the application cannot connect to Nostr relays or synchronize profile data.

### 2. ConnectionStatus Component
- **File**: `src/app/layout.tsx`
- **Status**: Temporarily disabled
- **Description**: This component displays the connection status to Nostr relays. It's currently commented out.
- **Impact**: Users cannot see the connection status to Nostr relays.

## Mock Implementations

### 1. mockNostrService
- **File**: `src/services/nostr/mockNostrService.ts`
- **Status**: Active fallback
- **Description**: A mock implementation of the Nostr service that provides empty implementations of all methods to prevent errors when the real service is not available.
- **Methods**:
  - `subscribe()`: Logs the subscription but doesn't actually subscribe to any events
  - `unsubscribe()`: Logs the unsubscription but doesn't do anything
  - `publishEvent()`: Logs the event but doesn't publish it
  - `getEvents()`: Returns an empty array
  - `connect()`: Updates state to "connected" but doesn't actually connect
  - `disconnect()`: Updates state to "disconnected"
  - `addStateListener()`: Adds a listener but only for mock state changes

### 2. useNostrConnection Hook
- **File**: `src/hooks/useNostrConnection.ts`
- **Status**: Modified with fallback
- **Description**: This hook now tries to use the real Nostr service but falls back to the mock service if the real one is not available or doesn't have the required methods.
- **Fallback Logic**:
  ```typescript
  // Use a try-catch to determine which service to use
  let nostrService;
  try {
    // Check if the real service has the required methods
    if (realNostrService && typeof realNostrService.addStateListener === 'function') {
      nostrService = realNostrService;
      console.log('Using real Nostr service');
    } else {
      console.warn('Real Nostr service missing required methods, falling back to mock');
      nostrService = mockNostrService;
    }
  } catch (error) {
    console.error('Error initializing Nostr service, falling back to mock:', error);
    nostrService = mockNostrService;
  }
  ```

### 3. useProfileSync Hook
- **File**: `src/hooks/useProfileSync.ts`
- **Status**: Modified with fallback
- **Description**: This hook now tries to use the real Nostr service but falls back to the mock service if the real one is not available or doesn't have the required methods.
- **Fallback Logic**: Similar to useNostrConnection, it checks if the real service has the required methods and falls back to the mock if needed.

## Error Handling Additions

### 1. NostrInitializer Component
- **File**: `src/components/NostrInitializer.tsx`
- **Status**: Modified with error handling
- **Description**: Added try-catch blocks and error state to prevent crashes if there are issues during initialization.

### 2. useNostrConnection Hook
- **File**: `src/hooks/useNostrConnection.ts`
- **Status**: Modified with error handling
- **Description**: Added try-catch blocks around all nostrService method calls to prevent crashes if there are issues.

### 3. useProfileSync Hook
- **File**: `src/hooks/useProfileSync.ts`
- **Status**: Modified with error handling
- **Description**: Added try-catch blocks around all nostrService method calls to prevent crashes if there are issues.

### 4. Modal Component
- **File**: `src/components/ui/Modal.tsx`
- **Status**: Modified with error handling
- **Description**: Added try-catch blocks around event listener code to prevent crashes if there are issues.

### 5. MainLayout Component
- **File**: `src/components/layout/MainLayout.tsx`
- **Status**: Modified with error handling
- **Description**: Added try-catch blocks around event listener code to prevent crashes if there are issues.

### 6. ErrorBoundary Component
- **File**: `src/components/ErrorBoundary.tsx`
- **Status**: New component
- **Description**: A React error boundary component that catches and handles client-side errors to prevent the entire app from crashing.

### 7. ErrorHandler Component
- **File**: `src/components/ErrorHandler.tsx`
- **Status**: New component
- **Description**: A component that initializes the global error handler to catch unhandled errors.

### 8. Global Error Handler
- **File**: `src/utils/errorHandler.ts`
- **Status**: New utility
- **Description**: A utility that sets up global error handling for unhandled errors and promise rejections.

## External Service Connections

### 1. Nostr Relays
- **Status**: Temporarily disabled
- **Relay URLs**:
  - `wss://relay.xeadline.com`
  - `wss://relay.damus.io`
  - `wss://relay.nostr.band`
  - `wss://nos.lol`
  - `wss://relay.snort.social`
  - `wss://nostr.wine`
- **Impact**: The application cannot publish or subscribe to events on the Nostr network.

### 2. Supabase
- **Status**: Active
- **Connection**: The Supabase connection appears to be working, as evidenced by the database migrations and API endpoints.
- **API Endpoints**:
  - `src/pages/api/add-nip05.js`: Adds NIP-05 verification
  - `src/pages/api/nip05/remove.js`: Removes NIP-05 verification
  - `src/pages/api/.well-known/nostr.json.js`: Serves the NIP-05 verification JSON

## Next Steps for Re-enabling Nostr Connectivity

To re-enable proper Nostr connections and the connection status indicator, we need to:

1. Fix the NostrInitializer component to handle errors gracefully
2. Re-enable the NostrInitializer component in the app layout
3. Re-enable the ConnectionStatus component in the app layout
4. Test the connection to ensure it works properly
5. Gradually remove the fallbacks and mock implementations once the real services are working reliably

The key files that need to be modified are:
- `src/app/layout.tsx`: Uncomment the NostrInitializer and ConnectionStatus components
- `src/hooks/useNostrConnection.ts`: Ensure it properly handles errors and falls back gracefully
- `src/hooks/useProfileSync.ts`: Ensure it properly handles errors and falls back gracefully