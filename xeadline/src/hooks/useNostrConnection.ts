import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { updateConnectionStatus, setInitialized, connectToRelays } from '../redux/slices/nostrSlice';
import { selectIsAuthenticated } from '../redux/slices/authSlice';
import nostrService from '../services/nostr/nostrService';

/**
 * Hook to initialize Nostr connection and listen for state changes
 * Only connects to relays when user is authenticated
 */
export const useNostrConnection = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUserPublicKey = useAppSelector(state => state.auth.currentUser?.publicKey);

  useEffect(() => {
    // Mark as initialized regardless of authentication status
    dispatch(setInitialized(true));
    
    // Only proceed with connection if user is authenticated
    if (!isAuthenticated || !currentUserPublicKey) {
      console.log('NostrConnection: User not authenticated, skipping connection');
      return;
    }
    
    console.log('NostrConnection: User authenticated, establishing connection');
    let unsubscribe = () => {};
    
    // Set up listener for Nostr service state changes
    unsubscribe = nostrService.addStateListener((state) => {
      dispatch(updateConnectionStatus(state));
    });
    
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
  }, [dispatch, isAuthenticated, currentUserPublicKey]);
};

export default useNostrConnection;