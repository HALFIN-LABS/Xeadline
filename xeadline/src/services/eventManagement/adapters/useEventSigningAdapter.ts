/**
 * Hook Adapter for the Event Management System
 * 
 * This adapter provides a React hook that is compatible with the existing
 * useEventSigning hook but uses the new Event Management System.
 */

import { useCallback, useState } from 'react';
import { EventManager } from '../EventManager';
import { UnsignedEvent, SigningOptions, PublishOptions, SignAndPublishOptions } from '../types';
import { usePasswordModal } from '../../../contexts/PasswordModalContext';

/**
 * Adapter hook to provide backward compatibility with useEventSigning
 * 
 * @param eventManager The EventManager to use
 * @returns An object with the same API as useEventSigning
 */
export function useEventSigningAdapter(eventManager: EventManager) {
  const passwordModal = usePasswordModal();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  
  /**
   * Signs an event with password prompt if needed
   * 
   * @param unsignedEvent The event to sign
   * @param purpose The purpose of signing (for the password prompt)
   * @param options Signing options
   * @returns A promise that resolves to the signing result
   */
  const signEventWithPassword = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign this event',
    options: SigningOptions = {}
  ) => {
    try {
      setIsSigningInProgress(true);
      
      console.log('useEventSigningAdapter: Signing event with password if needed');
      
      // Try to sign directly first
      const result = await eventManager.signEvent(unsignedEvent, options);
      
      // If successful or error is not related to password, return the result
      if (result.success || !result.needsPassword) {
        return result;
      }
      
      // If a password is needed, show the password modal
      try {
        console.log('useEventSigningAdapter: Password needed, showing password modal');
        const password = await passwordModal.showPasswordModal(purpose);
        
        // Try to sign with the password
        return await eventManager.signEvent(unsignedEvent, {
          ...options,
          password
        });
      } catch (passwordError) {
        console.error('useEventSigningAdapter: Password entry cancelled or failed:', passwordError);
        
        // User cancelled or other error
        return {
          success: false,
          error: 'Password entry cancelled'
        };
      }
    } finally {
      setIsSigningInProgress(false);
    }
  }, [eventManager, passwordModal]);
  
  /**
   * Signs and publishes an event in one operation
   * 
   * @param unsignedEvent The event to sign and publish
   * @param purpose The purpose of signing (for the password prompt)
   * @param options Signing and publishing options
   * @returns A promise that resolves to the sign and publish result
   */
  const signAndPublishEvent = useCallback(async (
    unsignedEvent: UnsignedEvent,
    purpose: string = 'sign and publish this event',
    options: SignAndPublishOptions = {}
  ) => {
    console.log('useEventSigningAdapter: Signing and publishing event');
    
    // First sign the event
    const signingResult = await signEventWithPassword(unsignedEvent, purpose, options);
    
    // If signing failed, return the result
    if (!signingResult.success || !signingResult.event) {
      return {
        ...signingResult,
        publishedTo: []
      };
    }
    
    // If skipPublish is true, return the signed event without publishing
    if (options.skipPublish) {
      console.log('useEventSigningAdapter: Skip publish requested, returning signed event only');
      return {
        ...signingResult,
        publishedTo: []
      };
    }
    
    // Publish the event
    console.log('useEventSigningAdapter: Publishing signed event');
    const publishResult = await eventManager.publishEvent(signingResult.event, options);
    
    // Return combined result
    return {
      ...signingResult,
      publishedTo: publishResult.publishedTo,
      error: publishResult.error
    };
  }, [eventManager, signEventWithPassword]);
  
  return {
    signEventWithPassword,
    signAndPublishEvent,
    isSigningInProgress
  };
}