'use client';

import { useNostrConnection } from '@/hooks/useNostrConnection';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useAppSelector } from '@/redux/hooks';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { useEffect } from 'react';
import { isFeatureEnabled } from '@/utils/featureFlags';

/**
 * Component that initializes the Nostr connection and profile synchronization
 * This is a client component that should be included in the layout
 */
const NostrInitializer = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Always call hooks unconditionally at the top level
  const connectionEnabled = isFeatureEnabled('nostr.enableConnection');
  const profileSyncEnabled = isFeatureEnabled('nostr.enableProfileSync');
  
  // Initialize Nostr connection
  useNostrConnection();
  
  // Initialize profile synchronization if user is authenticated
  const currentUserPublicKey = useAppSelector(state => state.auth.currentUser?.publicKey);
  useProfileSync();
  
  // Log initialization status
  useEffect(() => {
    console.log('NostrInitializer: Connection enabled:', connectionEnabled);
    console.log('NostrInitializer: Profile sync enabled:', profileSyncEnabled);
    console.log('NostrInitializer: User authenticated:', isAuthenticated);
    
    if (isAuthenticated && currentUserPublicKey) {
      console.log('NostrInitializer: Current user public key:', currentUserPublicKey);
    }
  }, [connectionEnabled, profileSyncEnabled, isAuthenticated, currentUserPublicKey]);
  
  // This component doesn't render anything
  return null;
};

export default NostrInitializer;