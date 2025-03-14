import Link from 'next/link';

export default function AllPage() {
  return (
    <div className="space-y-6">
      {/* Sticky filters at the top */}
      <div className="sticky top-14 z-10 bg-gray-950 dark:bg-gray-950 py-4 border-b border-gray-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-1.5 rounded-full bg-bottle-green text-white text-sm font-medium">
              New
            </button>
            <button className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
              Hot
            </button>
            <button className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
              Top
            </button>
            <button className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
              Rising
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Latest posts
          </p>
        </div>
      </div>
      
      {/* Posts */}
      <div className="space-y-6 pt-2">
        {/* Sample posts */}
        {[1, 2, 3, 4, 5].map((post) => (
          <AllPostCard key={post} />
        ))}
      </div>
    </div>
  );
}

function AllPostCard() {
  // Generate random topic
  const topics = ['bitcoin', 'lightning', 'nostr', 'technology', 'privacy'];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  // Generate random username
  const usernames = ['satoshi', 'alice', 'bob', 'carol', 'dave'];
  const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
  
  // Generate random time
  const times = ['just now', '5 minutes ago', '30 minutes ago', '1 hour ago', '3 hours ago'];
  const randomTime = times[Math.floor(Math.random() * times.length)];
  
  // Generate random title
  const titles = [
    'Interesting Development in the Bitcoin Space',
    'New Lightning Network Feature Announced',
    'How Nostr is Changing Social Media',
    'Privacy-Focused Technologies on the Rise',
    'The Future of Decentralized Applications'
  ];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  
  // Randomly determine if this post has an image or video
  const hasMedia = Math.random() > 0.5;
  const mediaType = hasMedia ? (Math.random() > 0.5 ? 'image' : 'video') : null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden max-w-2xl mx-auto flex flex-col min-h-[400px]">
      {/* Post header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link href={`/topic/${randomTopic}`} className="font-medium text-bottle-green hover:underline mr-2">
            t/{randomTopic}
          </Link>
          <span className="mr-2">•</span>
          <span>Posted by </span>
          <Link href={`/user/${randomUsername}`} className="hover:underline mx-1">
            @{randomUsername}
          </Link>
          <span className="mr-2">•</span>
          <span>{randomTime}</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">
          <Link href="/post/1" className="hover:underline">
            {randomTitle}
          </Link>
        </h2>
      </div>
      
      {/* Media content (if any) */}
      {mediaType === 'image' && (
        <div className="relative h-64 bg-gray-100 dark:bg-gray-700">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="ml-2 text-sm">{randomTopic} Image</span>
          </div>
        </div>
      )}
      
      {mediaType === 'video' && (
        <div className="relative h-64 bg-gray-100 dark:bg-gray-700">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="ml-2 text-sm">{randomTopic} Video</span>
          </div>
        </div>
      )}
      
      {/* Post content preview */}
      <div className="p-5 flex-grow">
        <p className="text-base text-gray-700 dark:text-gray-300">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
      
      {/* Post actions */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 flex items-center text-gray-500 dark:text-gray-400 text-sm mt-auto">
        <button className="flex items-center mr-6 hover:text-bottle-green">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span>{Math.floor(Math.random() * 100)}</span>
        </button>
        <button className="flex items-center mr-6 hover:text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>{Math.floor(Math.random() * 20)}</span>
        </button>
        <button className="flex items-center mr-6 hover:text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{Math.floor(Math.random() * 50)} comments</span>
        </button>
        <button className="flex items-center hover:text-yellow-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Zap</span>
        </button>
      </div>
    </div>
  );
}