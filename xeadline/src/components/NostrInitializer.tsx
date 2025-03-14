'use client';

import { useNostrConnection } from '@/hooks/useNostrConnection';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useAppSelector } from '@/redux/hooks';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';

/**
 * Component that initializes the Nostr connection and profile synchronization
 * This is a client component that should be included in the layout
 */
export const NostrInitializer = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Initialize Nostr connection
  useNostrConnection();
  
  // Initialize profile synchronization
  // The hook will check authentication status internally
  useProfileSync();
  
  // This component doesn't render anything
  return null;
};

export default NostrInitializer;