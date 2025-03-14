'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { disconnectFromRelays } from '../../redux/slices/nostrSlice';
import RelayStatusModal from './RelayStatusModal';
import nostrService from '../../services/nostr/nostrService';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const { status, error, connectedRelays } = useAppSelector((state) => state.nostr);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDisconnect = () => {
    dispatch(disconnectFromRelays());
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
        className={`fixed bottom-4 left-4 z-50 hidden md:block ${className} cursor-pointer transition-transform hover:scale-105`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center mb-1">
            <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor()}`}></div>
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          
          {status === 'error' && error && (
            <div className="text-xs text-red-500 mb-1">{error}</div>
          )}
          
          {connectedRelays.length > 0 && (
            <div className="text-xs text-gray-400">
              Connected to {connectedRelays.length} relay{connectedRelays.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      
      <RelayStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        relayUrls={nostrService.relayUrls || []}
      />
    </>
  );
};

export default ConnectionStatus;