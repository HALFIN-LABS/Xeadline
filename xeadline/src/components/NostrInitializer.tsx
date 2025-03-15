'use client';

import { useNostrConnection } from '@/hooks/useNostrConnection';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useAppSelector } from '@/redux/hooks';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { useEffect, useState } from 'react';

/**
 * Component that initializes the Nostr connection and profile synchronization
 * This is a client component that should be included in the layout
 */
export const NostrInitializer = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    try {
      // This is a safety measure to catch any errors during initialization
      console.log('NostrInitializer mounted');
    } catch (err) {
      console.error('Error in NostrInitializer:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);
  
  // If there was an error during initialization, render nothing but log the error
  if (error) {
    console.error('NostrInitializer encountered an error:', error);
    return null;
  }
  
  try {
    // Initialize Nostr connection
    useNostrConnection();
    
    // Initialize profile synchronization
    // The hook will check authentication status internally
    useProfileSync();
  } catch (err) {
    console.error('Error initializing Nostr services:', err);
  }
  
  // This component doesn't render anything
  return null;
};

export default NostrInitializer;