'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children, title, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    // Close modal on escape key
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    
    if (isOpen) {
      try {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
        // Prevent scrolling of the body when modal is open
        document.body.style.overflow = 'hidden';
      } catch (error) {
        console.error('Error adding event listeners:', error);
      }
    }
    
    return () => {
      try {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'auto';
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Backdrop - glassmorphic effect */}
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm transition-opacity" />
    
    {/* Modal - true glassmorphic effect */}
    <div
      ref={modalRef}
      className="bg-black/40 backdrop-blur-md border border-gray-700/30 rounded-xl shadow-2xl w-full max-w-2xl mx-4 z-10 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Modal header - glassmorphic */}
        <div className="px-6 py-4 border-b border-gray-700/20 flex justify-between items-center bg-black/30 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-white">
            {title}
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:text-white focus:outline-none transition-colors"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal content - scrollable with always visible scrollbar */}
        <div
          ref={contentRef}
          className="px-6 py-6 custom-scrollbar flex-grow overflow-auto text-gray-100"
          style={{
            minHeight: footer ? '300px' : '400px', // Larger min height
            maxHeight: footer ? 'calc(85vh - 180px)' : 'calc(85vh - 100px)', // Adjust max height for footer
          }}
        >
          {children}
        </div>
        
        {/* Fixed footer - glassmorphic */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-700/20 bg-black/30 backdrop-blur-sm">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}