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
      
      // Ensure the event has a valid pubkey
      if (!unsignedEvent.pubkey && currentUser?.publicKey) {
        console.log('useEventSigning: Setting missing pubkey on event');
        unsignedEvent.pubkey = currentUser.publicKey;
      }
      
      console.log('useEventSigning: Attempting to sign event', {
        eventKind: unsignedEvent.kind,
        hasPrivateKey: !!currentUser?.privateKey,
        hasEncryptedKey: !!currentUser?.encryptedPrivateKey,
        isExtensionAvailable: typeof window !== 'undefined' && !!window.nostr,
        pubkey: unsignedEvent.pubkey?.substring(0, 8) + '...'
      });
      
      // First try with extension - this is the most reliable method and matches login behavior
      if (typeof window !== 'undefined' && window.nostr) {
        try {
          console.log('useEventSigning: Trying to sign with extension first');
          
          // Try to sign with the extension directly
          const extensionResult = await signEvent(unsignedEvent, {
            timeout: options.timeout || 10000
          });
          
          if (extensionResult.success) {
            console.log('useEventSigning: Successfully signed with extension');
            return extensionResult;
          }
        } catch (extensionError) {
          console.warn('useEventSigning: Extension signing failed, will try other methods', extensionError);
          // Continue to other methods
        }
      }
      
      // Try to sign with the current user's private key
      if (currentUser?.privateKey) {
        console.log('useEventSigning: Trying to sign with in-memory private key');
        
        const privateKeyResult = await signEvent(unsignedEvent, {
          privateKey: currentUser.privateKey,
          timeout: options.timeout
        });
        
        // If successful, return the result
        if (privateKeyResult.success) {
          console.log('useEventSigning: Successfully signed with in-memory private key');
          return privateKeyResult;
        }
      }
      
      // If a password is needed, show the password modal
      if (currentUser?.encryptedPrivateKey) {
        try {
          console.log('useEventSigning: Trying to sign with encrypted private key');
          
          // Show the password modal and get the password
          const password = await passwordModal.showPasswordModal(purpose);
          
          console.log('useEventSigning: Password received, attempting to sign with password');
          
          // Try to sign with the password
          const passwordResult = await signEvent(unsignedEvent, {
            password,
            timeout: options.timeout
          });
          
          if (passwordResult.success) {
            console.log('useEventSigning: Successfully signed with decrypted private key');
          } else {
            console.error('useEventSigning: Failed to sign with decrypted private key', passwordResult.error);
          }
          
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
        error: 'No signing method available. Please ensure you are logged in with a private key or extension.'
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
      console.log('useEventSigning: Successfully signed event, now publishing', {
        eventId: signingResult.event.id,
        eventKind: signingResult.event.kind,
        pubkey: signingResult.event.pubkey.substring(0, 8) + '...'
      });
      
      // Publish the event with retries
      let publishedTo: string[] = [];
      let retryCount = 0;
      const maxRetries = options.retries || 2;
      
      while (retryCount <= maxRetries) {
        try {
          publishedTo = await nostrService.publishEvent(signingResult.event);
          
          if (publishedTo.length > 0) {
            console.log(`useEventSigning: Successfully published to ${publishedTo.length} relays`, {
              relays: publishedTo
            });
            break;
          } else {
            console.warn(`useEventSigning: Failed to publish to any relays (attempt ${retryCount + 1}/${maxRetries + 1})`);
            retryCount++;
            
            if (retryCount <= maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            }
          }
        } catch (publishError) {
          console.error(`useEventSigning: Error publishing event (attempt ${retryCount + 1}/${maxRetries + 1})`, publishError);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
          }
        }
      }
      
      // Return the result with the published relays
      if (publishedTo.length > 0) {
        return {
          ...signingResult,
          publishedTo
        };
      } else {
        return {
          ...signingResult,
          error: `Failed to publish event after ${maxRetries + 1} attempts`,
          publishedTo: []
        };
      }
    } catch (error) {
      console.error('Error in publish process:', error);
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