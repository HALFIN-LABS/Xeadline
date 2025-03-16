# Nostr Event Signing Architecture

## Problem Statement

Xeadline requires a consistent and reliable way to sign Nostr events across the application. Currently, signing logic is duplicated across different components and slices, leading to:

1. Inconsistent user experience
2. Duplicated code
3. Difficulty handling encrypted private keys
4. Poor error handling and recovery

## Proposed Solution

We propose creating a centralized event signing service that handles all Nostr event signing throughout the application, with a consistent UI for password prompts when needed.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React          │     │  Redux          │     │  Nostr          │
│  Components     │◄────┤  Store/Actions  │◄────┤  Services       │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │                       │
         └───────────┬───────────┴───────────┬───────────┘
                     │                       │
                     ▼                       ▼
           ┌─────────────────────┐  ┌─────────────────────┐
           │                     │  │                     │
           │  Event Signing      │  │  Password Modal     │
           │  Service            │◄─┤  Context Provider   │
           │                     │  │                     │
           └─────────────────────┘  └─────────────────────┘
```

## Components

### 1. Event Signing Service

Create a new service at `src/services/nostr/eventSigningService.ts` that will:

- Handle all event signing operations
- Support multiple signing methods (extension, in-memory key, encrypted key)
- Provide a consistent API for all components
- Handle errors and retries

```typescript
// Example API
interface SignEventOptions {
  event: UnsignedEvent;
  privateKey?: string;
  onPasswordRequired?: () => Promise<string>;
  retryCount?: number;
}

async function signEvent(options: SignEventOptions): Promise<SignedEvent>;
```

### 2. Password Modal Context

Create a React context provider that manages the password modal state and provides a consistent UI for password prompts:

```typescript
// src/contexts/PasswordModalContext.tsx
interface PasswordModalContextType {
  showPasswordModal: (purpose: string) => Promise<string>;
  isModalVisible: boolean;
}

const PasswordModalContext = createContext<PasswordModalContextType | undefined>(undefined);

export function PasswordModalProvider({ children }: { children: React.ReactNode }) {
  // Implementation...
}

export function usePasswordModal() {
  const context = useContext(PasswordModalContext);
  if (context === undefined) {
    throw new Error('usePasswordModal must be used within a PasswordModalProvider');
  }
  return context;
}
```

### 3. Redux Integration

Create a new slice or middleware that integrates with the event signing service:

```typescript
// src/redux/middleware/eventSigningMiddleware.ts
export const eventSigningMiddleware: Middleware = store => next => action => {
  if (action.type === 'nostr/signEvent') {
    // Handle event signing...
  }
  return next(action);
};
```

### 4. React Hook for Event Signing

Create a custom hook that components can use to sign events:

```typescript
// src/hooks/useEventSigning.ts
export function useEventSigning() {
  const dispatch = useAppDispatch();
  const passwordModal = usePasswordModal();
  
  const signEvent = useCallback(async (event: UnsignedEvent) => {
    // Implementation...
  }, [dispatch, passwordModal]);
  
  return { signEvent };
}
```

## Implementation Plan

### Phase 1: Core Service

1. Create the event signing service with support for:
   - Nostr extension signing
   - In-memory private key signing
   - Encrypted private key signing with password prompt

2. Add comprehensive error handling and logging

### Phase 2: UI Components

1. Create the password modal component
2. Implement the password modal context provider
3. Create a custom hook for accessing the password modal

### Phase 3: Redux Integration

1. Create actions for event signing
2. Implement middleware or thunks for handling event signing
3. Update existing slices to use the new signing service

### Phase 4: Migration

1. Update the topic subscription functionality to use the new service
2. Migrate other components that require event signing
3. Add tests for the new service and components

## Usage Examples

### Example 1: Subscribing to a Topic

```typescript
function TopicSubscriptionButton({ topicId }) {
  const { signEvent } = useEventSigning();
  const dispatch = useAppDispatch();
  
  const handleSubscribe = async () => {
    try {
      // Create the unsigned event
      const unsignedEvent = createSubscriptionEvent(topicId);
      
      // Sign the event
      const signedEvent = await signEvent(unsignedEvent);
      
      // Publish the event
      await dispatch(publishEvent(signedEvent));
      
      // Update the UI
      dispatch(addSubscription(topicId));
    } catch (error) {
      // Handle errors
    }
  };
  
  return <button onClick={handleSubscribe}>Subscribe</button>;
}
```

### Example 2: Creating a Post

```typescript
function CreatePostForm({ topicId }) {
  const { signEvent } = useEventSigning();
  const dispatch = useAppDispatch();
  const [content, setContent] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Create the unsigned event
      const unsignedEvent = createPostEvent(topicId, content);
      
      // Sign the event
      const signedEvent = await signEvent(unsignedEvent);
      
      // Publish the event
      await dispatch(publishEvent(signedEvent));
      
      // Reset the form
      setContent('');
    } catch (error) {
      // Handle errors
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <textarea value={content} onChange={e => setContent(e.target.value)} />
      <button type="submit">Post</button>
    </form>
  );
}
```

## Benefits

1. **Consistency**: All event signing follows the same pattern and provides the same user experience
2. **Reusability**: The signing service can be used across the entire application
3. **Maintainability**: Changes to signing logic only need to be made in one place
4. **Better UX**: Users get a consistent experience when signing events
5. **Error Handling**: Centralized error handling and recovery

## Considerations

### Security

- The service should never store unencrypted private keys
- Password prompts should have rate limiting to prevent brute force attacks
- Consider adding a timeout for decrypted keys

### Performance

- Consider caching decrypted keys for a short period to avoid multiple password prompts
- Implement debouncing for rapid signing requests

### Compatibility

- Ensure compatibility with different Nostr extensions
- Support both NIP-07 and custom signing methods

## Next Steps

1. Create the event signing service
2. Implement the password modal context
3. Update the Redux store to use the new service
4. Migrate existing components to use the new service