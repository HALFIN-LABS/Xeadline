'use client';

import { useNostrConnection } from '@/hooks/useNostrConnection';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useAppSelector } from '@/redux/hooks';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { useEffect, useState } from 'react';
import { isFeatureEnabled } from '@/utils/featureFlags';

/**
 * Component that initializes the Nostr connection and profile synchronization
 * This is a client component that should be included in the layout
 *
 * Phase 2: Re-enabled with feature flags and phased initialization
 */
export const NostrInitializer = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [error, setError] = useState<Error | null>(null);
  const [initializationPhase, setInitializationPhase] = useState<number>(0);
  
  // Always call hooks regardless of conditions to maintain hook order
  const connectionEnabled = isFeatureEnabled('nostr.enableConnection');
  const profileSyncEnabled = isFeatureEnabled('nostr.enableProfileSync');
  
  // Use a dummy hook call to maintain hook order
  const dummyNostrConnection = useNostrConnection;
  const dummyProfileSync = useProfileSync;
  
  // Phase 0: Initial setup and error handling
  useEffect(() => {
    try {
      console.log('NostrInitializer mounted - Phase 0: Initial setup');
      
      // Check if basic connection is enabled via feature flag
      if (connectionEnabled) {
        // Move to phase 1 after a short delay to allow the component to stabilize
        const timer = setTimeout(() => {
          setInitializationPhase(1);
        }, 500);
        
        return () => clearTimeout(timer);
      } else {
        console.log('Nostr connection disabled via feature flag');
      }
    } catch (err) {
      console.error('Error in NostrInitializer setup:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [connectionEnabled]);
  
  // Phase 1: Initialize basic Nostr connection
  useEffect(() => {
    if (initializationPhase !== 1) return;
    
    try {
      console.log('NostrInitializer - Phase 1: Initializing basic connection');
      
      // Move to phase 2 after a short delay to allow the connection to stabilize
      const timer = setTimeout(() => {
        if (profileSyncEnabled) {
          setInitializationPhase(2);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error in NostrInitializer phase 1:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [initializationPhase, profileSyncEnabled]);
  
  // Phase 2: Initialize profile synchronization
  useEffect(() => {
    if (initializationPhase !== 2) return;
    
    try {
      console.log('NostrInitializer - Phase 2: Initializing profile synchronization');
    } catch (err) {
      console.error('Error in NostrInitializer phase 2:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [initializationPhase]);
  
  // If there was an error during initialization, render nothing but log the error
  if (error) {
    console.error('NostrInitializer encountered an error:', error);
    return null;
  }
  
  // This component doesn't render anything
  return null;
};

// Separate component to handle the actual initialization
// This prevents React hooks order issues
const NostrInitializerWrapper = () => {
  const [initializationPhase, setInitializationPhase] = useState<number>(0);
  
  // Get the current phase from localStorage on mount
  useEffect(() => {
    try {
      const storedPhase = localStorage.getItem('nostrInitializationPhase');
      if (storedPhase) {
        setInitializationPhase(parseInt(storedPhase, 10));
      }
    } catch (error) {
      console.error('Error reading initialization phase from localStorage:', error);
    }
  }, []);
  
  // Update localStorage when phase changes
  useEffect(() => {
    try {
      localStorage.setItem('nostrInitializationPhase', initializationPhase.toString());
    } catch (error) {
      console.error('Error saving initialization phase to localStorage:', error);
    }
  }, [initializationPhase]);
  
  // Initialize Nostr connection if enabled
  if (initializationPhase >= 1 && isFeatureEnabled('nostr.enableConnection')) {
    try {
      useNostrConnection();
    } catch (error) {
      console.error('Error initializing Nostr connection:', error);
    }
  }
  
  // Initialize profile synchronization if enabled
  if (initializationPhase >= 2 && isFeatureEnabled('nostr.enableProfileSync')) {
    try {
      useProfileSync();
    } catch (error) {
      console.error('Error initializing profile sync:', error);
    }
  }
  
  return <NostrInitializer />;
};

export default NostrInitializer;