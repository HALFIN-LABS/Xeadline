'use client';

import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { ConnectionStatus } from '../../services/nostr/nostrService';

interface RelayStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  relayUrls: string[];
  onDisconnect?: () => void;
  onReconnect?: () => void;
  status?: ConnectionStatus;
  isAuthenticated?: boolean;
  isAuthInitialized?: boolean;
}

const RelayStatusModal: React.FC<RelayStatusModalProps> = ({
  isOpen,
  onClose,
  relayUrls,
  onDisconnect,
  onReconnect,
  status = 'disconnected',
  isAuthenticated = false,
  isAuthInitialized = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { connectedRelays } = useAppSelector((state) => state.nostr);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Handle escape key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Ensure relayUrls is always an array
  const safeRelayUrls = Array.isArray(relayUrls) ? relayUrls : [];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 animate-modal-appear"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Relay Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {!isAuthInitialized && (
          <div className="text-center py-4 mb-4 bg-gray-700 rounded-lg">
            <p className="text-gray-300">Authentication is initializing...</p>
          </div>
        )}
        
        {isAuthInitialized && !isAuthenticated && (
          <div className="text-center py-4 mb-4 bg-gray-700 rounded-lg">
            <p className="text-gray-300">You are not signed in. Sign in to connect to Nostr relays.</p>
          </div>
        )}
        
        {isAuthenticated && (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {safeRelayUrls.length > 0 ? (
                safeRelayUrls.map((url) => {
                  const isConnected = connectedRelays.includes(url);
                  const isPrimary = url === safeRelayUrls[0];
                  
                  return (
                    <div
                      key={url}
                      className={`p-3 rounded-lg ${isPrimary ? 'border border-bottle-green' : 'border border-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[200px]">{url}</span>
                            {isPrimary && (
                              <span className="text-xs text-bottle-green">Primary Relay</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-gray-400">
                  No relays configured
                </div>
              )}
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              {connectedRelays.length} of {safeRelayUrls.length} relays connected
            </div>
            
            {/* Connection control buttons */}
            <div className="mt-4 flex justify-center space-x-4">
              {status === 'connected' && onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Disconnect
                </button>
              )}
              
              {(status === 'disconnected' || status === 'error') && onReconnect && (
                <button
                  onClick={onReconnect}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RelayStatusModal;