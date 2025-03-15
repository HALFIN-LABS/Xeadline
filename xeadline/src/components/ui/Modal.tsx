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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 z-10 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
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
          className="px-6 py-4 custom-scrollbar flex-grow overflow-auto"
          style={{
            minHeight: footer ? '200px' : '300px', // Smaller min height when footer is present
            maxHeight: footer ? 'calc(80vh - 180px)' : 'calc(80vh - 100px)', // Adjust max height for footer
          }}
        >
          {/* Spacer to ensure content is scrollable */}
          <div className="absolute top-0 right-0 w-px h-[1500px] opacity-0 pointer-events-none" aria-hidden="true"></div>
          
          {children}
          
          {/* Visual indicator that content is scrollable */}
          {!footer && (
            <div className="sticky bottom-0 text-center text-xs text-gray-500 dark:text-gray-400 mt-4 pb-2 bg-gradient-to-t from-white dark:from-gray-900 pt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="ml-1">Scroll for more</span>
            </div>
          )}
        </div>
        
        {/* Fixed footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}