'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { disconnectFromRelays, connectToRelays } from '../../redux/slices/nostrSlice';
import { selectIsAuthenticated, selectIsAuthInitialized } from '../../redux/slices/authSlice';
import RelayStatusModal from './RelayStatusModal';
import nostrService from '../../services/nostr/nostrService';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const { status, error, connectedRelays } = useAppSelector((state) => state.nostr);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const relayUrls = nostrService.getRelays();

  const handleDisconnect = () => {
    dispatch(disconnectFromRelays());
  };

  const handleReconnect = () => {
    dispatch(connectToRelays());
  };

  // Status indicator styles
  const getStatusColor = () => {
    // If auth is not initialized yet, show gray
    if (!isAuthInitialized) {
      return 'bg-gray-500';
    }
    
    // If user is not authenticated, show gray with a different shade
    if (!isAuthenticated) {
      return 'bg-gray-400';
    }
    
    // Otherwise, show status based on connection state
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
    // If auth is not initialized yet, show initializing
    if (!isAuthInitialized) {
      return 'Initializing...';
    }
    
    // If user is not authenticated, show not signed in
    if (!isAuthenticated) {
      return 'Not Signed In';
    }
    
    // Otherwise, show status based on connection state
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

  // Position fixed at bottom right for desktop, hidden on mobile
  return (
    <>
      <div
        className={`fixed bottom-4 right-4 z-50 hidden md:block ${className} cursor-pointer transition-transform hover:scale-105`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="bg-gray-800 rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm font-medium">{getStatusText()}</span>
          {isAuthenticated && connectedRelays.length > 0 && (
            <span className="text-sm text-gray-400">
              ({connectedRelays.length}/{relayUrls.length || 0})
            </span>
          )}
          {status === 'error' && error && isAuthenticated && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>
      
      <RelayStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        relayUrls={relayUrls}
        onDisconnect={handleDisconnect}
        onReconnect={handleReconnect}
        status={status}
        isAuthenticated={isAuthenticated}
        isAuthInitialized={isAuthInitialized}
      />
    </>
  );
};

export default ConnectionStatus;