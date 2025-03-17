import Link from 'next/link';

export default function PopularPage() {
  return (
    <div className="space-y-6">
      {/* Sticky filters at the top */}
      <div className="sticky top-14 z-10 bg-gray-50 dark:bg-[rgb(10,10,10)] py-4 border-b border-gray-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button className="tab tab-selected">
              Today
            </button>
            <button className="tab tab-unselected">
              This Week
            </button>
            <button className="tab tab-unselected">
              This Month
            </button>
            <button className="tab tab-unselected">
              All Time
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Most popular
          </p>
        </div>
      </div>
      
      {/* Posts */}
      <div className="space-y-6 pt-2">
        {/* Sample posts */}
        {[1, 2, 3, 4, 5].map((post, index, array) => (
          <div key={post}>
            <PopularPostCard index={post} />
            {index < array.length - 1 && (
              <div className="h-[1px] bg-gray-300 dark:bg-gray-600 border-t border-gray-400 dark:border-gray-500 mt-6 mb-6 max-w-[45rem] mx-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PopularPostCard({ index, hasMedia = Math.random() > 0.5 }: { index: number, hasMedia?: boolean }) {
  // Randomly determine if this post has an image or video
  const mediaType = hasMedia ? (Math.random() > 0.5 ? 'image' : 'video') : null;
  
  // Determine if this is a short post (no media)
  const isShortPost = !mediaType;
  
  return (
    <div className="rounded-xl hover:bg-gray-50 hover:shadow-md dark:hover:bg-gray-800/80 overflow-hidden flex max-w-2xl mx-auto transition-all">
      {/* Rank */}
      <div className="w-10 flex items-center justify-center">
        <div className="text-lg font-bold text-gray-400">{index}</div>
      </div>
      
      <div className="flex-1">
        {/* Post header */}
        <div className="p-3 pb-2">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/topic/technology" className="font-medium text-bottle-green hover:underline mr-1">
              t/technology
            </Link>
            <span className="mx-1">•</span>
            <span>Posted by </span>
            <Link href="/user/alice" className="hover:underline mx-1">
              @alice
            </Link>
            <span className="mx-1">•</span>
            <span>8 hours ago</span>
          </div>
          <h2 className="text-lg font-semibold mb-1">
            <Link href="/post/1" className="hover:underline">
              New Decentralized Social Media Platform Gains Traction
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
              <span className="ml-2 text-sm">Social Media Platform Image</span>
            </div>
          </div>
        )}
        
        {mediaType === 'video' && (
          <div className="relative h-64 bg-gray-100 dark:bg-gray-700">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="ml-2 text-sm">Social Media Platform Video</span>
            </div>
          </div>
        )}
        
        {/* Post content preview - only show for short posts without media */}
        {isShortPost && (
          <div className="px-3 pb-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              A new decentralized social media platform built on open protocols is gaining significant
              traction among users concerned about privacy and censorship. The platform promises
              to give users full control over their data and content.
            </p>
          </div>
        )}
        
        {/* Post actions */}
        <div className="px-3 py-2 flex items-center space-x-2 text-white text-xs">
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 bg-transparent border border-gray-400 dark:border-gray-500 border-opacity-70 dark:border-opacity-70 border-[0.5px] px-2 py-1 rounded-full hover:bg-white/10 hover:text-bottle-green transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="font-medium">142</span>
            </button>
            
            <button className="flex items-center space-x-1 bg-transparent border border-gray-400 dark:border-gray-500 border-opacity-70 dark:border-opacity-70 border-[0.5px] px-2 py-1 rounded-full hover:bg-white/10 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-medium">14</span>
            </button>
          </div>
          
          <button className="flex items-center space-x-1 bg-transparent border border-gray-400 dark:border-gray-500 border-opacity-70 dark:border-opacity-70 border-[0.5px] px-2 py-1 rounded-full hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>45 comments</span>
          </button>
          
          <button className="flex items-center space-x-1 bg-transparent border border-gray-400 dark:border-gray-500 border-opacity-70 dark:border-opacity-70 border-[0.5px] px-2 py-1 rounded-full hover:bg-white/10 hover:text-yellow-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Zap</span>
          </button>
          
          <button className="flex items-center space-x-1 bg-transparent border border-gray-400 dark:border-gray-500 border-opacity-70 dark:border-opacity-70 border-[0.5px] px-2 py-1 rounded-full hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}