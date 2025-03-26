'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../redux/hooks';
import { initializeAuth } from '../../services/authService';
import { setAuthInitialized } from '../../redux/slices/authSlice';

/**
 * AuthInitializer component
 *
 * This component initializes the authentication state when the app loads.
 * It checks for existing sessions and Nostr extension availability.
 *
 * It now also signals when authentication initialization is complete via Redux state,
 * which helps coordinate with NostrInitializer to prevent race conditions.
 *
 * This component doesn't render anything visible, it just performs the initialization.
 */
export default function AuthInitializer() {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    // Initialize authentication state
    const initAuth = async () => {
      try {
        setIsInitializing(true);
        console.log('AuthInitializer: Starting authentication initialization');
        await initializeAuth(dispatch);
        console.log('AuthInitializer: Authentication state initialized');
      } catch (error) {
        console.error('AuthInitializer: Error initializing auth', error);
      } finally {
        setIsInitializing(false);
        // Signal that auth initialization is complete
        console.log('AuthInitializer: Setting auth initialization complete flag');
        dispatch(setAuthInitialized(true));
      }
    };
    
    initAuth();
    
    // Cleanup function
    return () => {
      // If component unmounts during initialization, still mark as initialized
      // to prevent hanging state
      if (isInitializing) {
        console.log('AuthInitializer: Component unmounting during initialization, marking as complete');
        dispatch(setAuthInitialized(true));
      }
    };
  }, [dispatch]);
  
  // This component doesn't render anything
  return null;
}