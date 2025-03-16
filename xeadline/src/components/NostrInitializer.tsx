'use client';

import { useNostrConnection } from '@/hooks/useNostrConnection';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { initializeSubscriptions } from '@/redux/slices/topicSlice';
import { useEffect } from 'react';
import { isFeatureEnabled } from '@/utils/featureFlags';

/**
 * Component that initializes the Nostr connection and profile synchronization
 * This is a client component that should be included in the layout
 */
const NostrInitializer = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Always call hooks unconditionally at the top level
  const connectionEnabled = isFeatureEnabled('nostr.enableConnection');
  const profileSyncEnabled = isFeatureEnabled('nostr.enableProfileSync');
  const subscriptionSyncEnabled = isFeatureEnabled('nostr.enableSubscriptionSync', true); // Default to true
  
  // Initialize Nostr connection
  useNostrConnection();
  
  // Initialize profile synchronization if user is authenticated
  const currentUserPublicKey = useAppSelector(state => state.auth.currentUser?.publicKey);
  useProfileSync();
  
  // Initialize topic subscriptions
  useEffect(() => {
    if (subscriptionSyncEnabled) {
      console.log('NostrInitializer: Initializing topic subscriptions');
      dispatch(initializeSubscriptions());
    }
  }, [dispatch, subscriptionSyncEnabled, isAuthenticated, currentUserPublicKey]);
  
  // Log initialization status
  useEffect(() => {
    console.log('NostrInitializer: Connection enabled:', connectionEnabled);
    console.log('NostrInitializer: Profile sync enabled:', profileSyncEnabled);
    console.log('NostrInitializer: Subscription sync enabled:', subscriptionSyncEnabled);
    console.log('NostrInitializer: User authenticated:', isAuthenticated);
    
    if (isAuthenticated && currentUserPublicKey) {
      console.log('NostrInitializer: Current user public key:', currentUserPublicKey);
    }
  }, [connectionEnabled, profileSyncEnabled, subscriptionSyncEnabled, isAuthenticated, currentUserPublicKey]);
  
  // This component doesn't render anything
  return null;
};

export default NostrInitializer;