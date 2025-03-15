import { useEffect } from 'react';
import { useAppDispatch } from '../redux/hooks';
import { updateConnectionStatus, setInitialized, connectToRelays } from '../redux/slices/nostrSlice';

// Import both real and mock services
import realNostrService from '../services/nostr/nostrService';
import mockNostrService from '../services/nostr/mockNostrService';

// Use a try-catch to determine which service to use
let nostrService;
try {
  // Check if the real service has the required methods
  if (realNostrService && typeof realNostrService.addStateListener === 'function') {
    nostrService = realNostrService;
    console.log('Using real Nostr service');
  } else {
    console.warn('Real Nostr service missing required methods, falling back to mock');
    nostrService = mockNostrService;
  }
} catch (error) {
  console.error('Error initializing Nostr service, falling back to mock:', error);
  nostrService = mockNostrService;
}

/**
 * Hook to initialize Nostr connection and listen for state changes
 * Automatically connects to relays on mount
 */
export const useNostrConnection = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let unsubscribe = () => {};
    
    try {
      // Check if nostrService and addStateListener exist
      if (nostrService && typeof nostrService.addStateListener === 'function') {
        // Set up listener for Nostr service state changes
        unsubscribe = nostrService.addStateListener((state) => {
          try {
            dispatch(updateConnectionStatus(state));
          } catch (error) {
            console.error('Error updating connection status:', error);
          }
        });
      } else {
        console.error('nostrService.addStateListener is not a function');
      }

      // Mark as initialized
      dispatch(setInitialized(true));
      
      // Automatically connect to relays
      dispatch(connectToRelays());
    } catch (error) {
      console.error('Error in useNostrConnection:', error);
    }

    // Clean up listener on unmount
    return () => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('Error unsubscribing from nostrService:', error);
      }
    };
  }, [dispatch]);
};

export default useNostrConnection;