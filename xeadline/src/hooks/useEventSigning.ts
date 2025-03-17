"use client";

import { useCallback, useState } from 'react';
import { usePasswordModal } from '../contexts/PasswordModalContext';
import { signEvent, UnsignedEvent, SigningResult } from '../services/nostr/eventSigningService';
import { useAppSelector } from '../redux/hooks';
import { selectCurrentUser } from '../redux/slices/authSlice';
import nostrService from '../services/nostr/nostrService';

export interface SignAndPublishOptions {
  timeout?: number;
  retries?: number;
  skipPublish?: boolean;
}

export interface SignAndPublishResult extends SigningResult {
  publishedTo?: string[];
}

export function useEventSigning() {
  const passwordModal = usePasswordModal();
  const currentUser = useAppSelector(selectCurrentUser);
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  
  /**
   * Sign an event with password prompt if needed
   */
  const signEventWithPassword = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign this event',
    options: SignAndPublishOptions = {}
  ): Promise<SigningResult> => {
    try {
      if (isSigningInProgress) {
        console.warn('useEventSigning: Another signing operation is already in progress');
        return {
          success: false,
          error: 'Another signing operation is already in progress'
        };
      }
      
      setIsSigningInProgress(true);
      console.log('useEventSigning: Attempting to sign event', {
        eventKind: unsignedEvent.kind,
        hasPrivateKey: !!currentUser?.privateKey,
        hasEncryptedKey: !!currentUser?.encryptedPrivateKey,
        isExtensionAvailable: typeof window !== 'undefined' && !!window.nostr
      });
      
      // Try to sign with the current user's private key
      const initialResult = await signEvent(unsignedEvent, {
        privateKey: currentUser?.privateKey,
        timeout: options.timeout
      });
      
      // If successful, return the result
      if (initialResult.success) {
        return initialResult;
      }
      
      // If a password is needed, show the password modal
      if (initialResult.needsPassword && currentUser?.encryptedPrivateKey) {
        try {
          console.log('useEventSigning: Password required, showing modal');
          
          // Show the password modal and get the password
          const password = await passwordModal.showPasswordModal(purpose);
          
          console.log('useEventSigning: Password received, attempting to sign with password');
          
          // Try to sign with the password
          const passwordResult = await signEvent(unsignedEvent, {
            password,
            timeout: options.timeout
          });
          
          return passwordResult;
        } catch (passwordError) {
          console.error('useEventSigning: Password entry cancelled or failed', passwordError);
          
          // User cancelled or other error
          return {
            success: false,
            error: 'Password entry cancelled'
          };
        }
      }
      
      // If we get here, we couldn't sign the event
      console.error('useEventSigning: No signing method available');
      return {
        success: false,
        error: initialResult.error || 'No signing method available'
      };
    } catch (error) {
      console.error('Error in signEventWithPassword:', error);
      return {
        success: false,
        error: 'Unexpected error during signing: ' + (error instanceof Error ? error.message : String(error))
      };
    } finally {
      setIsSigningInProgress(false);
    }
  }, [currentUser, passwordModal, isSigningInProgress]);
  
  /**
   * Sign and publish an event in one operation
   */
  const signAndPublishEvent = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign and publish this event',
    options: SignAndPublishOptions = {}
  ): Promise<SignAndPublishResult> => {
    // First sign the event
    const signingResult = await signEventWithPassword(unsignedEvent, purpose, options);
    
    // If signing failed, return the result
    if (!signingResult.success || !signingResult.event) {
      return signingResult;
    }
    
    // If skipPublish is true, return the signed event without publishing
    if (options.skipPublish) {
      return {
        ...signingResult,
        publishedTo: []
      };
    }
    
    try {
      // Publish the event
      const publishedTo = await nostrService.publishEvent(signingResult.event);
      
      // Return the result with the published relays
      return {
        ...signingResult,
        publishedTo
      };
    } catch (error) {
      console.error('Error publishing event:', error);
      return {
        ...signingResult,
        error: 'Event signed successfully but failed to publish: ' +
          (error instanceof Error ? error.message : String(error)),
        publishedTo: []
      };
    }
  }, [signEventWithPassword]);
  
  return {
    signEventWithPassword,
    signAndPublishEvent,
    isSigningInProgress
  };
}