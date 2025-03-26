'use client';

import { useNostrConnection } from '@/hooks/useNostrConnection';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { selectIsAuthenticated, selectIsAuthInitialized } from '@/redux/slices/authSlice';
import { initializeSubscriptions } from '@/redux/slices/topicSlice';
import { useEffect } from 'react';
import { isFeatureEnabled } from '@/utils/featureFlags';

/**
 * Component that initializes the Nostr connection and profile synchronization
 * This is a client component that should be included in the layout
 *
 * The component now ensures proper initialization order:
 * 1. Wait for authentication state to be restored (using Redux state)
 * 2. Initialize Nostr connection only if authenticated
 * 3. Initialize profile and topic subscriptions
 */
const NostrInitializer = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUserPublicKey = useAppSelector(state => state.auth.currentUser?.publicKey);
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);
  
  // Feature flags
  const connectionEnabled = isFeatureEnabled('nostr.enableConnection');
  const profileSyncEnabled = isFeatureEnabled('nostr.enableProfileSync');
  const subscriptionSyncEnabled = isFeatureEnabled('nostr.enableSubscriptionSync', true); // Default to true
  
  // Initialize Nostr connection - the hook now handles authentication dependency internally
  useNostrConnection();
  
  // Initialize profile synchronization if user is authenticated
  useProfileSync();
  
  // Initialize topic subscriptions only after auth is initialized and if user is authenticated
  useEffect(() => {
    if (!isAuthInitialized) {
      console.log('NostrInitializer: Waiting for auth initialization to complete');
      return; // Wait for auth to initialize
    }
    
    if (subscriptionSyncEnabled && isAuthenticated && currentUserPublicKey) {
      console.log('NostrInitializer: Initializing topic subscriptions');
      dispatch(initializeSubscriptions());
    }
  }, [dispatch, subscriptionSyncEnabled, isAuthenticated, currentUserPublicKey, isAuthInitialized]);
  
  // Log initialization status
  useEffect(() => {
    console.log('NostrInitializer: Connection enabled:', connectionEnabled);
    console.log('NostrInitializer: Profile sync enabled:', profileSyncEnabled);
    console.log('NostrInitializer: Subscription sync enabled:', subscriptionSyncEnabled);
    console.log('NostrInitializer: User authenticated:', isAuthenticated);
    console.log('NostrInitializer: Auth initialized:', isAuthInitialized);
    
    if (isAuthenticated && currentUserPublicKey) {
      console.log('NostrInitializer: Current user public key:', currentUserPublicKey);
    }
  }, [connectionEnabled, profileSyncEnabled, subscriptionSyncEnabled, isAuthenticated, currentUserPublicKey, isAuthInitialized]);
  
  // This component doesn't render anything
  return null;
};

export default NostrInitializer;