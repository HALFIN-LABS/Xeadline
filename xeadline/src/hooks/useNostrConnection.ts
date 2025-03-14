import { useEffect } from 'react';
import { useAppDispatch } from '../redux/hooks';
import nostrService from '../services/nostr/nostrService';
import { updateConnectionStatus, setInitialized, connectToRelays } from '../redux/slices/nostrSlice';

/**
 * Hook to initialize Nostr connection and listen for state changes
 * Automatically connects to relays on mount
 */
export const useNostrConnection = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Set up listener for Nostr service state changes
    const unsubscribe = nostrService.addStateListener((state) => {
      dispatch(updateConnectionStatus(state));
    });

    // Mark as initialized
    dispatch(setInitialized(true));
    
    // Automatically connect to relays
    dispatch(connectToRelays());

    // Clean up listener on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
};

export default useNostrConnection;