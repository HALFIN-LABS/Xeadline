# Event Signing Implementation Guide

This document provides a detailed implementation plan for the Nostr event signing architecture described in `NOSTR_EVENT_SIGNING.md`.

## 1. Event Signing Service

### File: `src/services/nostr/eventSigningService.ts`

```typescript
import { Event, getEventHash } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';
import { retrievePrivateKey } from '../../utils/nostrKeys';

// Types
export interface UnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
}

export interface SigningResult {
  success: boolean;
  event?: Event;
  error?: string;
  needsPassword?: boolean;
}

export interface SigningOptions {
  privateKey?: string;
  password?: string;
  retryCount?: number;
}

// Maximum number of retries
const MAX_RETRIES = 3;

/**
 * Sign a Nostr event using the available signing method
 * 
 * @param unsignedEvent The event to sign
 * @param options Signing options
 * @returns A promise that resolves to the signing result
 */
export async function signEvent(
  unsignedEvent: UnsignedEvent,
  options: SigningOptions = {}
): Promise<SigningResult> {
  const { privateKey, password, retryCount = 0 } = options;
  
  try {
    // Try to sign with Nostr extension
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        // Set the pubkey from the extension
        unsignedEvent.pubkey = await window.nostr.getPublicKey();
        
        // Sign the event
        const signedEvent = await window.nostr.signEvent(unsignedEvent);
        
        return {
          success: true,
          event: signedEvent
        };
      } catch (extensionError) {
        console.error('Error signing with extension:', extensionError);
        // Fall through to try other methods
      }
    }
    
    // Try to sign with provided private key
    if (privateKey) {
      try {
        // Create a copy of the event
        const event: Event = {
          ...unsignedEvent,
          id: '',
          sig: ''
        };
        
        // Generate the event ID
        event.id = getEventHash(event);
        
        // Sign the event
        const privateKeyBytes = hexToBytes(privateKey);
        const sig = schnorr.sign(event.id, privateKeyBytes);
        event.sig = Buffer.from(sig).toString('hex');
        
        return {
          success: true,
          event
        };
      } catch (privateKeyError) {
        console.error('Error signing with private key:', privateKeyError);
        return {
          success: false,
          error: 'Failed to sign with private key'
        };
      }
    }
    
    // Try to decrypt and use stored private key
    if (password) {
      try {
        const decryptedKey = await retrievePrivateKey(password);
        
        if (!decryptedKey) {
          return {
            success: false,
            error: 'Invalid password'
          };
        }
        
        // Recursively call signEvent with the decrypted key
        return signEvent(unsignedEvent, {
          ...options,
          privateKey: decryptedKey,
          password: undefined
        });
      } catch (decryptionError) {
        console.error('Error decrypting private key:', decryptionError);
        return {
          success: false,
          error: 'Failed to decrypt private key'
        };
      }
    }
    
    // If we've exhausted all options, indicate that a password is needed
    return {
      success: false,
      needsPassword: true,
      error: 'Password required to decrypt private key'
    };
  } catch (error) {
    console.error('Error in signEvent:', error);
    
    // Retry if we haven't exceeded the maximum retries
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying event signing (${retryCount + 1}/${MAX_RETRIES})...`);
      return signEvent(unsignedEvent, {
        ...options,
        retryCount: retryCount + 1
      });
    }
    
    return {
      success: false,
      error: `Failed to sign event after ${MAX_RETRIES} attempts`
    };
  }
}
```

## 2. Password Modal Context

### File: `src/contexts/PasswordModalContext.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';

interface PasswordModalContextType {
  showPasswordModal: (purpose: string) => Promise<string>;
  isModalVisible: boolean;
  purpose: string;
  dismissModal: () => void;
}

const PasswordModalContext = createContext<PasswordModalContextType | undefined>(undefined);

export function PasswordModalProvider({ children }: { children: React.ReactNode }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [resolvePassword, setResolvePassword] = useState<((password: string) => void) | null>(null);
  const [rejectPassword, setRejectPassword] = useState<((reason: any) => void) | null>(null);
  
  const showPasswordModal = useCallback((purpose: string) => {
    setPurpose(purpose);
    setIsModalVisible(true);
    
    return new Promise<string>((resolve, reject) => {
      setResolvePassword(() => resolve);
      setRejectPassword(() => reject);
    });
  }, []);
  
  const dismissModal = useCallback(() => {
    setIsModalVisible(false);
    if (rejectPassword) {
      rejectPassword('User cancelled password entry');
    }
    setResolvePassword(null);
    setRejectPassword(null);
  }, [rejectPassword]);
  
  const submitPassword = useCallback((password: string) => {
    setIsModalVisible(false);
    if (resolvePassword) {
      resolvePassword(password);
    }
    setResolvePassword(null);
    setRejectPassword(null);
  }, [resolvePassword]);
  
  const contextValue = {
    showPasswordModal,
    isModalVisible,
    purpose,
    dismissModal
  };
  
  return (
    <PasswordModalContext.Provider value={contextValue}>
      {children}
      {isModalVisible && <PasswordModal onSubmit={submitPassword} onCancel={dismissModal} purpose={purpose} />}
    </PasswordModalContext.Provider>
  );
}

export function usePasswordModal() {
  const context = useContext(PasswordModalContext);
  if (context === undefined) {
    throw new Error('usePasswordModal must be used within a PasswordModalProvider');
  }
  return context;
}

// Password Modal Component
function PasswordModal({ 
  onSubmit, 
  onCancel, 
  purpose 
}: { 
  onSubmit: (password: string) => void; 
  onCancel: () => void; 
  purpose: string;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    onSubmit(password);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Enter Password</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Your private key is encrypted. Please enter your password to {purpose}.
        </p>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 3. Event Signing Hook

### File: `src/hooks/useEventSigning.ts`

```typescript
import { useCallback } from 'react';
import { usePasswordModal } from '../contexts/PasswordModalContext';
import { signEvent, UnsignedEvent, SigningResult } from '../services/nostr/eventSigningService';
import { useAppSelector } from '../redux/hooks';
import { selectCurrentUser } from '../redux/slices/authSlice';

export function useEventSigning() {
  const passwordModal = usePasswordModal();
  const currentUser = useAppSelector(selectCurrentUser);
  
  const signEventWithPassword = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign this event'
  ): Promise<SigningResult> => {
    try {
      // Try to sign with the current user's private key
      const initialResult = await signEvent(unsignedEvent, {
        privateKey: currentUser?.privateKey
      });
      
      // If successful, return the result
      if (initialResult.success) {
        return initialResult;
      }
      
      // If a password is needed, show the password modal
      if (initialResult.needsPassword && currentUser?.encryptedPrivateKey) {
        try {
          // Show the password modal and get the password
          const password = await passwordModal.showPasswordModal(purpose);
          
          // Try to sign with the password
          const passwordResult = await signEvent(unsignedEvent, { password });
          
          return passwordResult;
        } catch (passwordError) {
          // User cancelled or other error
          return {
            success: false,
            error: 'Password entry cancelled'
          };
        }
      }
      
      // If we get here, we couldn't sign the event
      return {
        success: false,
        error: 'No signing method available'
      };
    } catch (error) {
      console.error('Error in signEventWithPassword:', error);
      return {
        success: false,
        error: 'Unexpected error during signing'
      };
    }
  }, [currentUser, passwordModal]);
  
  return { signEventWithPassword };
}
```

## 4. Redux Integration

### File: `src/redux/slices/eventSlice.ts`

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Event } from 'nostr-tools';
import { signEvent, UnsignedEvent } from '../../services/nostr/eventSigningService';
import nostrService from '../../services/nostr/nostrService';
import { RootState } from '../store';

interface EventState {
  pendingEvents: Record<string, Event>;
  publishedEvents: Record<string, string[]>; // Event ID -> Array of relay URLs
  loading: boolean;
  error: string | null;
}

const initialState: EventState = {
  pendingEvents: {},
  publishedEvents: {},
  loading: false,
  error: null
};

// Async thunk for signing and publishing an event
export const signAndPublishEvent = createAsyncThunk(
  'event/signAndPublish',
  async (
    { 
      unsignedEvent, 
      password 
    }: { 
      unsignedEvent: UnsignedEvent; 
      password?: string;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      // Get the current user's private key
      const state = getState() as RootState;
      const currentUser = state.auth.currentUser;
      
      // Sign the event
      const signingResult = await signEvent(unsignedEvent, {
        privateKey: currentUser?.privateKey,
        password
      });
      
      if (!signingResult.success) {
        if (signingResult.needsPassword) {
          return rejectWithValue({
            error: 'Password required',
            needsPassword: true
          });
        }
        return rejectWithValue({
          error: signingResult.error || 'Failed to sign event'
        });
      }
      
      const signedEvent = signingResult.event!;
      
      // Publish the event
      const publishedTo = await nostrService.publishEvent(signedEvent);
      
      if (publishedTo.length === 0) {
        return rejectWithValue({
          error: 'Failed to publish to any relays'
        });
      }
      
      return {
        event: signedEvent,
        publishedTo
      };
    } catch (error) {
      return rejectWithValue({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signAndPublishEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signAndPublishEvent.fulfilled, (state, action) => {
        state.loading = false;
        const { event, publishedTo } = action.payload;
        state.pendingEvents[event.id] = event;
        state.publishedEvents[event.id] = publishedTo;
      })
      .addCase(signAndPublishEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? (action.payload as any).error : 'Failed to sign and publish event';
      });
  }
});

export const { clearError } = eventSlice.actions;

export default eventSlice.reducer;
```

## 5. Integration Example

### File: `src/components/common/EventSigningButton.tsx`

```typescript
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { signAndPublishEvent } from '../../redux/slices/eventSlice';
import { usePasswordModal } from '../../contexts/PasswordModalContext';
import { UnsignedEvent } from '../../services/nostr/eventSigningService';

interface EventSigningButtonProps {
  createEvent: () => UnsignedEvent;
  onSuccess?: (eventId: string) => void;
  onError?: (error: string) => void;
  purpose: string;
  children: React.ReactNode;
  className?: string;
}

export function EventSigningButton({
  createEvent,
  onSuccess,
  onError,
  purpose,
  children,
  className = ''
}: EventSigningButtonProps) {
  const dispatch = useAppDispatch();
  const passwordModal = usePasswordModal();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    try {
      setIsLoading(true);
      
      // Create the unsigned event
      const unsignedEvent = createEvent();
      
      // Try to sign and publish without password first
      const result = await dispatch(signAndPublishEvent({
        unsignedEvent
      })).unwrap();
      
      // If successful, call onSuccess
      if (result && result.event) {
        onSuccess?.(result.event.id);
      }
    } catch (error: any) {
      // If password is required, show the password modal
      if (error.needsPassword) {
        try {
          // Show the password modal
          const password = await passwordModal.showPasswordModal(purpose);
          
          // Try again with the password
          const result = await dispatch(signAndPublishEvent({
            unsignedEvent: createEvent(), // Create a fresh event with updated timestamp
            password
          })).unwrap();
          
          // If successful, call onSuccess
          if (result && result.event) {
            onSuccess?.(result.event.id);
          }
        } catch (passwordError) {
          // User cancelled or other error
          onError?.('Password entry cancelled');
        }
      } else {
        // Other error
        onError?.(error.error || 'Failed to sign and publish event');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
}
```

## 6. App Integration

### File: `src/app/layout.tsx` (or appropriate root component)

```typescript
import { PasswordModalProvider } from '../contexts/PasswordModalContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PasswordModalProvider>
          {/* Other providers */}
          {children}
        </PasswordModalProvider>
      </body>
    </html>
  );
}
```

## 7. Usage Example: Topic Subscription

### File: `src/components/topic/TopicSubscriptionButton.tsx`

```typescript
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectIsSubscribed } from '../../redux/slices/topicSlice';
import { EventSigningButton } from '../common/EventSigningButton';
import { UnsignedEvent } from '../../services/nostr/eventSigningService';

interface TopicSubscriptionButtonProps {
  topicId: string;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
}

export function TopicSubscriptionButton({
  topicId,
  onSubscribe,
  onUnsubscribe
}: TopicSubscriptionButtonProps) {
  const dispatch = useAppDispatch();
  const isSubscribed = useAppSelector(state => selectIsSubscribed(state, topicId));
  const currentUser = useAppSelector(state => state.auth.currentUser);
  
  // Create subscription event
  const createSubscriptionEvent = (): UnsignedEvent => ({
    kind: 34551, // NIP-72 topic subscription
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', topicId], // Topic ID
      ['a', 'subscribe'], // Action
      ['client', 'xeadline']
    ],
    content: '',
    pubkey: currentUser?.publicKey || ''
  });
  
  // Create unsubscription event
  const createUnsubscriptionEvent = (): UnsignedEvent => ({
    kind: 34551, // NIP-72 topic subscription
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', topicId], // Topic ID
      ['a', 'unsubscribe'], // Action
      ['client', 'xeadline']
    ],
    content: '',
    pubkey: currentUser?.publicKey || ''
  });
  
  // Handle successful subscription
  const handleSubscribeSuccess = () => {
    // Update local state
    dispatch({ type: 'topic/addSubscription', payload: topicId });
    onSubscribe?.();
  };
  
  // Handle successful unsubscription
  const handleUnsubscribeSuccess = () => {
    // Update local state
    dispatch({ type: 'topic/removeSubscription', payload: topicId });
    onUnsubscribe?.();
  };
  
  if (!currentUser) {
    return null;
  }
  
  return isSubscribed ? (
    <EventSigningButton
      createEvent={createUnsubscriptionEvent}
      onSuccess={handleUnsubscribeSuccess}
      purpose="unsubscribe from this topic"
      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
    >
      Joined
    </EventSigningButton>
  ) : (
    <EventSigningButton
      createEvent={createSubscriptionEvent}
      onSuccess={handleSubscribeSuccess}
      purpose="subscribe to this topic"
      className="px-4 py-2 bg-bottle-green text-white rounded-md hover:bg-bottle-green-700"
    >
      Join Topic
    </EventSigningButton>
  );
}
```

## Migration Strategy

1. **Start with the Core Services**:
   - Implement the event signing service
   - Implement the password modal context

2. **Create Reusable Components**:
   - Implement the EventSigningButton component
   - Add the PasswordModalProvider to the app layout

3. **Migrate Existing Functionality**:
   - Start with topic subscriptions
   - Move on to other event signing operations

4. **Testing**:
   - Test with different authentication methods (extension, private key, encrypted key)
   - Test error handling and recovery
   - Test the user experience

## Conclusion

This implementation plan provides a comprehensive approach to centralizing event signing in the Xeadline application. By following this plan, we can create a consistent, reliable, and user-friendly experience for all Nostr event signing operations.