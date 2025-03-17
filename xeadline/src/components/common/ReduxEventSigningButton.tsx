import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { signAndPublishEvent, selectEventLoading, clearError } from '../../redux/slices/eventSlice';
import { UnsignedEvent } from '../../services/nostr/eventSigningService';
import { EventPasswordPrompt } from './EventPasswordPrompt';

interface ReduxEventSigningButtonProps {
  createEvent: () => UnsignedEvent;
  onSuccess?: (eventId: string, publishedTo: string[]) => void;
  onError?: (error: string) => void;
  purpose: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  timeout?: number;
  skipPublish?: boolean;
}

/**
 * Button component that uses Redux for event signing and publishing
 */
export function ReduxEventSigningButton({
  createEvent,
  onSuccess,
  onError,
  purpose,
  children,
  className = '',
  disabled = false,
  timeout = 15000,
  skipPublish = false
}: ReduxEventSigningButtonProps) {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectEventLoading);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<UnsignedEvent | null>(null);
  
  const handleClick = async () => {
    if (isLoading || isProcessing || disabled) return;
    
    try {
      setIsProcessing(true);
      
      // Create the unsigned event
      const unsignedEvent = createEvent();
      setCurrentEvent(unsignedEvent);
      
      console.log('ReduxEventSigningButton: Created unsigned event', {
        kind: unsignedEvent.kind,
        tags: unsignedEvent.tags,
        content: unsignedEvent.content.length > 100 
          ? unsignedEvent.content.substring(0, 100) + '...' 
          : unsignedEvent.content
      });
      
      // Dispatch the sign and publish action
      const resultAction = await dispatch(signAndPublishEvent({
        unsignedEvent,
        timeout,
        skipPublish
      }));
      
      if (signAndPublishEvent.fulfilled.match(resultAction)) {
        const { event, publishedTo } = resultAction.payload;
        console.log('ReduxEventSigningButton: Successfully signed and published event', {
          id: event.id,
          pubkey: event.pubkey,
          publishedTo: publishedTo.length
        });
        
        onSuccess?.(event.id, publishedTo);
      } else if (signAndPublishEvent.rejected.match(resultAction)) {
        const payload = resultAction.payload as any;
        
        // If we have a signed event but failed to publish, still consider it a success
        if (payload?.event) {
          console.log('ReduxEventSigningButton: Event signed but failed to publish', {
            id: payload.event.id,
            error: payload.error
          });
          
          onSuccess?.(payload.event.id, []);
        } else if (!payload?.needsPassword) {
          // Only call onError if it's not a password prompt (that's handled separately)
          console.error('ReduxEventSigningButton: Error', payload?.error || resultAction.error);
          onError?.(payload?.error || resultAction.error?.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('ReduxEventSigningButton: Unexpected error', error);
      onError?.(error instanceof Error ? error.message : String(error));
      dispatch(clearError());
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle password provided by the EventPasswordPrompt
  const handlePasswordProvided = useCallback(async (password: string) => {
    if (!currentEvent) return;
    
    try {
      setIsProcessing(true);
      
      // Try again with the password
      const resultAction = await dispatch(signAndPublishEvent({
        unsignedEvent: createEvent(), // Create a fresh event with updated timestamp
        password,
        timeout,
        skipPublish
      }));
      
      if (signAndPublishEvent.fulfilled.match(resultAction)) {
        const { event, publishedTo } = resultAction.payload;
        console.log('ReduxEventSigningButton: Successfully signed with password', {
          id: event.id,
          publishedTo: publishedTo.length
        });
        
        onSuccess?.(event.id, publishedTo);
      } else if (signAndPublishEvent.rejected.match(resultAction)) {
        const payload = resultAction.payload as any;
        
        // If we have a signed event but failed to publish, still consider it a success
        if (payload?.event) {
          console.log('ReduxEventSigningButton: Event signed with password but failed to publish', {
            id: payload.event.id,
            error: payload.error
          });
          
          onSuccess?.(payload.event.id, []);
        } else {
          console.error('ReduxEventSigningButton: Error after password entry', payload?.error || resultAction.error);
          onError?.(payload?.error || resultAction.error?.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('ReduxEventSigningButton: Error after password entry', error);
      onError?.(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
      setCurrentEvent(null);
    }
  }, [currentEvent, createEvent, dispatch, onError, onSuccess, skipPublish, timeout]);
  
  // Handle password prompt cancelled
  const handlePasswordCancel = useCallback(() => {
    console.log('ReduxEventSigningButton: Password entry cancelled');
    onError?.('Password entry cancelled');
    setCurrentEvent(null);
    setIsProcessing(false);
  }, [onError]);
  
  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading || isProcessing || disabled}
        className={className}
        type="button"
      >
        {isLoading || isProcessing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : children}
      </button>
      
      {/* Password prompt that shows when needed */}
      <EventPasswordPrompt
        onPasswordProvided={handlePasswordProvided}
        onCancel={handlePasswordCancel}
        purpose={purpose}
      />
    </>
  );
}