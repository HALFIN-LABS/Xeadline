'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TopicsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/t/discover');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[rgb(10,10,10)]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Topics Discovery...</h1>
        <p className="text-gray-600 dark:text-gray-400">Please wait while we redirect you to the topics discovery page.</p>
      </div>
    </div>
  );
}