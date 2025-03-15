'use client';

/**
 * Global error handler to catch unhandled errors
 * This is especially useful for catching errors in event handlers
 */
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    // Save the original console.error
    const originalConsoleError = console.error;
    
    // Override console.error to log errors but prevent them from crashing the app
    console.error = function(...args) {
      // Call the original console.error
      originalConsoleError.apply(console, args);
      
      // Log additional information for debugging
      if (args[0] instanceof Error) {
        originalConsoleError('Error details:', {
          name: args[0].name,
          message: args[0].message,
          stack: args[0].stack
        });
      }
    };
    
    // Add global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      // Prevent the error from crashing the app
      event.preventDefault();
      return true;
    });
    
    // Add unhandled rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the rejection from crashing the app
      event.preventDefault();
      return true;
    });
  }
}