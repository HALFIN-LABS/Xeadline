'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '../../redux/hooks';
import { initializeAuth } from '../../services/authService';

/**
 * AuthInitializer component
 * 
 * This component initializes the authentication state when the app loads.
 * It checks for existing sessions and Nostr extension availability.
 * 
 * This component doesn't render anything visible, it just performs the initialization.
 */
export default function AuthInitializer() {
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    // Initialize authentication state
    initializeAuth(dispatch);
  }, [dispatch]);
  
  // This component doesn't render anything
  return null;
}