'use client';

import React from 'react';
import Link from 'next/link';

export default function SafariNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md bg-gray-800 p-8 rounded-lg shadow-lg text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bottle-green mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Browser Not Supported</h1>
          <p className="text-gray-300 mb-6">
            Xeadline is not currently supported on Safari.
          </p>
          <p className="text-gray-300 mb-6">
            Please use one of these browsers instead:
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <a
              href="https://brave.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            >
              <span>Brave</span>
            </a>
            <a
              href="https://www.mozilla.org/firefox/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            >
              <span>Firefox</span>
            </a>
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            >
              <span>Chrome</span>
            </a>
          </div>
          <div className="text-sm text-gray-400">
            <p>
              We're working on improving Safari compatibility in future updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}