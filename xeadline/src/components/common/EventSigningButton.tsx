"use client";

import React, { useState } from 'react';
import { SignAndPublishOptions, useEventSigning } from '../../hooks/useEventSigning';
import { UnsignedEvent } from '../../services/nostr/eventSigningService';

interface EventSigningButtonProps {
  createEvent: () => UnsignedEvent;
  onSuccess?: (eventId: string, publishedTo: string[]) => void;
  onError?: (error: string) => void;
  purpose: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  options?: SignAndPublishOptions;
}

export function EventSigningButton({
  createEvent,
  onSuccess,
  onError,
  purpose,
  children,
  className = '',
  disabled = false,
  options = {}
}: EventSigningButtonProps) {
  const { signAndPublishEvent, isSigningInProgress } = useEventSigning();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    if (isLoading || disabled || isSigningInProgress) return;
    
    try {
      setIsLoading(true);
      
      // Create the unsigned event
      const unsignedEvent = createEvent();
      console.log('EventSigningButton: Created unsigned event', {
        kind: unsignedEvent.kind,
        tags: unsignedEvent.tags,
        content: unsignedEvent.content.length > 100
          ? unsignedEvent.content.substring(0, 100) + '...'
          : unsignedEvent.content
      });
      
      // Sign and publish the event in one operation
      const result = await signAndPublishEvent(unsignedEvent, purpose, options);
      
      if (!result.success || !result.event) {
        console.error('EventSigningButton: Signing failed', result.error);
        onError?.(result.error || 'Failed to sign event');
        return;
      }
      
      console.log('EventSigningButton: Successfully signed event', {
        id: result.event.id,
        pubkey: result.event.pubkey
      });
      
      if (!result.publishedTo || result.publishedTo.length === 0) {
        if (options.skipPublish) {
          // If skipPublish was true, this is expected
          console.log('EventSigningButton: Event signed but not published (skipPublish=true)');
          onSuccess?.(result.event.id, []);
        } else {
          console.error('EventSigningButton: Failed to publish to any relays');
          onError?.('Failed to publish to any relays');
        }
        return;
      }
      
      console.log(`EventSigningButton: Published to ${result.publishedTo.length} relays`);
      
      // Call onSuccess with the event ID and published relays
      onSuccess?.(result.event.id, result.publishedTo);
    } catch (error) {
      console.error('EventSigningButton: Error', error);
      onError?.(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading || disabled || isSigningInProgress}
      className={className}
      type="button"
    >
      {isLoading || isSigningInProgress ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
}