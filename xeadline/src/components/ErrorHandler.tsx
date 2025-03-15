'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandler } from '@/utils/errorHandler';

/**
 * Component that initializes the global error handler
 * This is a client component that should be included in the layout
 */
export const ErrorHandler = () => {
  useEffect(() => {
    // Set up global error handler
    setupGlobalErrorHandler();
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default ErrorHandler;