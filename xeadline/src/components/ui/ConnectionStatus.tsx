'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { disconnectFromRelays } from '../../redux/slices/nostrSlice';
import RelayStatusModal from './RelayStatusModal';

// Import both real and mock services
import realNostrService from '../../services/nostr/nostrService';
import mockNostrService from '../../services/nostr/mockNostrService';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const { status, error, connectedRelays } = useAppSelector((state) => state.nostr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nostrService, setNostrService] = useState<any>(mockNostrService);
  const [relayUrls, setRelayUrls] = useState<string[]>([]);

  // Initialize nostrService and relayUrls
  useEffect(() => {
    try {
      // Check if the real service is available and has the required methods
      if (realNostrService && typeof realNostrService.getRelays === 'function') {
        setNostrService(realNostrService);
        setRelayUrls(realNostrService.getRelays());
        console.log('ConnectionStatus: Using real Nostr service');
      } else {
        console.warn('ConnectionStatus: Real Nostr service missing required methods, falling back to mock');
        setNostrService(mockNostrService);
        setRelayUrls(mockNostrService.getRelays());
      }
    } catch (error) {
      console.error('ConnectionStatus: Error initializing Nostr service, falling back to mock:', error);
      setNostrService(mockNostrService);
      setRelayUrls(mockNostrService.getRelays());
    }
  }, []);

  const handleDisconnect = () => {
    try {
      dispatch(disconnectFromRelays());
    } catch (error) {
      console.error('ConnectionStatus: Error disconnecting from relays:', error);
    }
  };

  // Status indicator styles
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  // Position fixed at bottom left for desktop, hidden on mobile
  return (
    <>
      <div
        className={`fixed bottom-4 right-4 z-50 hidden md:block ${className} cursor-pointer transition-transform hover:scale-105`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="bg-gray-800 rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm font-medium">{getStatusText()}</span>
          {connectedRelays.length > 0 && (
            <span className="text-sm text-gray-400">
              ({connectedRelays.length}/{relayUrls.length || 0})
            </span>
          )}
          {status === 'error' && error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>
      
      <RelayStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        relayUrls={relayUrls}
      />
    </>
  );
};

export default ConnectionStatus;