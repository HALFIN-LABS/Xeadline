'use client';

import React, { useEffect, useState } from 'react';
import SafariNotice from './SafariNotice';

export default function BrowserCheck({ children }: { children: React.ReactNode }) {
  const [isSafari, setIsSafari] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check if browser is Safari
    const userAgent = navigator.userAgent;
    const isSafariBrowser = 
      /^((?!chrome|android).)*safari/i.test(userAgent) && 
      !/(Chrome|Chromium|Brave)/i.test(userAgent);
    
    setIsSafari(isSafariBrowser);
    
    if (isSafariBrowser) {
      console.log('Safari browser detected, showing compatibility notice');
    }
  }, []);

  // During server-side rendering or before client-side hydration, render children
  if (!isClient) {
    return <>{children}</>;
  }

  // On client-side, check if Safari and render notice if needed
  return isSafari ? <SafariNotice /> : <>{children}</>;
}