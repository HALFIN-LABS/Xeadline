import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TestBlobPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the test page in the public directory
    window.location.href = '/test/blob-upload.html';
  }, []);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Redirecting to Blob Upload Test Page...</h1>
      <p>If you are not redirected automatically, <a href="/test/blob-upload.html">click here</a>.</p>
    </div>
  );
}