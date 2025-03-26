'use client';

import React from 'react';
import Link from 'next/link';

export default function RightSidebar() {
  return (
    <aside className="w-80 hidden lg:block flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto py-4 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      <div className="px-4">
        {/* Trending Posts */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Trending Posts</h2>
          <div className="space-y-3">
            <TrendingPost
              title="Lightning Network Adoption"
              posts={42}
              href="/topic/lightning/adoption"
            />
            <TrendingPost
              title="New Nostr Client Released"
              posts={38}
              href="/topic/nostr/clients"
            />
            <TrendingPost
              title="Bitcoin Conference 2025"
              posts={27}
              href="/topic/bitcoin/conference"
            />
            <TrendingPost
              title="Decentralized Social Media"
              posts={19}
              href="/topic/technology/decentralized"
            />
          </div>
        </div>

        {/* About Xeadspace */}
        <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">About Xeadspace</h2>
          <p className="text-sm mb-3">
            Xeadspace is a decentralized news and discussion platform built on Nostr and Lightning Network.
          </p>
          <p className="text-sm">
            Sign up to join the conversation and connect with others in the community.
          </p>
        </div>
      </div>
    </aside>
  );
}

function TrendingPost({
  title,
  posts,
  href
}: {
  title: string;
  posts: number;
  href: string
}) {
  return (
    <Link href={href} className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{posts} posts</p>
    </Link>
  );
}