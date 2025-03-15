'use client';

import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../../redux/hooks';

interface RelayStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  relayUrls: string[];
}

const RelayStatusModal: React.FC<RelayStatusModalProps> = ({ isOpen, onClose, relayUrls }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { connectedRelays } = useAppSelector((state) => state.nostr);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      try {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          onClose();
        }
      } catch (error) {
        console.error('RelayStatusModal: Error handling click outside:', error);
      }
    };
    
    if (isOpen) {
      try {
        document.addEventListener('mousedown', handleClickOutside);
      } catch (error) {
        console.error('RelayStatusModal: Error adding mousedown event listener:', error);
      }
    }
    
    return () => {
      try {
        document.removeEventListener('mousedown', handleClickOutside);
      } catch (error) {
        console.error('RelayStatusModal: Error removing mousedown event listener:', error);
      }
    };
  }, [isOpen, onClose]);
  
  // Handle escape key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      try {
        if (event.key === 'Escape') {
          onClose();
        }
      } catch (error) {
        console.error('RelayStatusModal: Error handling escape key:', error);
      }
    };
    
    if (isOpen) {
      try {
        document.addEventListener('keydown', handleEscKey);
      } catch (error) {
        console.error('RelayStatusModal: Error adding keydown event listener:', error);
      }
    }
    
    return () => {
      try {
        document.removeEventListener('keydown', handleEscKey);
      } catch (error) {
        console.error('RelayStatusModal: Error removing keydown event listener:', error);
      }
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
      </div>
    </div>
  );
};

export default RelayStatusModal;