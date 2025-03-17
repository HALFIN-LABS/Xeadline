import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectEventError, selectNeedsPassword, clearError } from '../../redux/slices/eventSlice';
import { usePasswordModal } from '../../contexts/PasswordModalContext';

interface EventPasswordPromptProps {
  onPasswordProvided: (password: string) => void;
  onCancel: () => void;
  purpose?: string;
}

/**
 * Component that monitors the event slice state and shows a password prompt when needed
 */
export function EventPasswordPrompt({
  onPasswordProvided,
  onCancel,
  purpose = 'sign this event'
}: EventPasswordPromptProps) {
  const dispatch = useAppDispatch();
  const needsPassword = useAppSelector(selectNeedsPassword);
  const error = useAppSelector(selectEventError);
  const passwordModal = usePasswordModal();
  
  useEffect(() => {
    let isMounted = true;
    
    const showPasswordPrompt = async () => {
      if (needsPassword) {
        try {
          // Show the password modal
          const password = await passwordModal.showPasswordModal(purpose);
          
          // If component is still mounted, call the callback
          if (isMounted) {
            onPasswordProvided(password);
          }
        } catch (error) {
          // User cancelled or other error
          if (isMounted) {
            onCancel();
          }
        } finally {
          // Clear the error state
          if (isMounted) {
            dispatch(clearError());
          }
        }
      }
    };
    
    showPasswordPrompt();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [needsPassword, passwordModal, onPasswordProvided, onCancel, dispatch, purpose]);
  
  // This component doesn't render anything directly
  return null;
}