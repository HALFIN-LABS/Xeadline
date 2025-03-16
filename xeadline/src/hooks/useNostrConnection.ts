import { useEffect } from 'react';
import { useAppDispatch } from '../redux/hooks';
import { updateConnectionStatus, setInitialized, connectToRelays } from '../redux/slices/nostrSlice';
import nostrService from '../services/nostr/nostrService';

/**
 * Hook to initialize Nostr connection and listen for state changes
 * Automatically connects to relays on mount
 */
export const useNostrConnection = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let unsubscribe = () => {};
    
    // Set up listener for Nostr service state changes
    unsubscribe = nostrService.addStateListener((state) => {
      dispatch(updateConnectionStatus(state));
    });

    // Mark as initialized
    dispatch(setInitialized(true));
    
    // Automatically connect to relays with retry logic
    const connectWithRetry = async (retries = 3, delay = 5000) => {
      try {
        await dispatch(connectToRelays()).unwrap();
        console.log('Successfully connected to relays');
      } catch (error) {
        console.error(`Connection attempt failed (${retries} retries left):`, error);
        if (retries > 0) {
          console.log(`Retrying connection in ${delay/1000} seconds...`);
          setTimeout(() => connectWithRetry(retries - 1, delay), delay);
        } else {
          console.error('All connection attempts failed');
        }
      }
    };
    
    connectWithRetry();

    // Clean up listener on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
};

export default useNostrConnection;