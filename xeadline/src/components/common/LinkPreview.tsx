'use client'

import React, { useState, useEffect } from 'react'

interface LinkPreviewProps {
  url: string
  className?: string
}

interface OpenGraphData {
  title?: string
  description?: string
  image?: string
  siteName?: string
  url?: string
}

/**
 * Component to display a preview of a link using Open Graph metadata
 * 
 * This implementation uses AllOrigins as a CORS proxy to fetch HTML content
 * directly from the client side without needing a server-side API.
 */
export const LinkPreview: React.FC<LinkPreviewProps> = ({
  url,
  className = ''
}) => {
  const [domain, setDomain] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [ogData, setOgData] = useState<OpenGraphData | null>(null)
  
  useEffect(() => {
    try {
      // Extract domain from URL
      const urlObj = new URL(url)
      setDomain(urlObj.hostname)
      
      // Use AllOrigins as a CORS proxy to fetch the HTML content
      const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      
      // In a production environment, we would implement proper error handling,
      // caching, and fallback strategies
      fetch(allOriginsUrl)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok')
          return response.json()
        })
        .then(data => {
          if (data && data.contents) {
            // Parse the HTML to extract Open Graph metadata
            const ogData = extractOpenGraphData(data.contents, url, domain)
            setOgData(ogData)
          } else {
            // Fallback to domain-based mock data if HTML couldn't be fetched
            setOgData(getDomainBasedFallbackData(url, domain))
          }
          setIsLoading(false)
        })
        .catch(err => {
          console.error('Error fetching link preview:', err)
          // Fallback to domain-based mock data on error
          setOgData(getDomainBasedFallbackData(url, domain))
          setIsLoading(false)
        })
    } catch (err) {
      console.error('Error parsing URL:', err)
      setError('Invalid URL')
      setIsLoading(false)
    }
  }, [url])
  
  // Extract Open Graph metadata from HTML
  const extractOpenGraphData = (html: string, url: string, domain: string): OpenGraphData => {
    // Create a simple object to store the Open Graph metadata
    const ogData: OpenGraphData = {
      url,
      siteName: domain,
      title: url,
      description: `Content from ${domain}`
    }
    
    // Extract the Open Graph metadata using regular expressions
    // In a production environment, you would use a proper HTML parser
    const ogTags = html.match(/<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi)
    
    if (ogTags) {
      ogTags.forEach((tag) => {
        const match = tag.match(/property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/i)
        if (match) {
          const [, property, content] = match
          if (property === 'title') ogData.title = content
          if (property === 'description') ogData.description = content
          if (property === 'image') ogData.image = content
          if (property === 'site_name') ogData.siteName = content
        }
      })
    }
    
    // Extract the title if not found in Open Graph metadata
    if (!ogData.title || ogData.title === url) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleMatch) {
        ogData.title = titleMatch[1]
      }
    }
    
    // Extract the description if not found in Open Graph metadata
    if (!ogData.description || ogData.description === `Content from ${domain}`) {
      const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']\s*\/?>/i)
      if (descriptionMatch) {
        ogData.description = descriptionMatch[1]
      }
    }
    
    // Extract Twitter Card metadata as a fallback
    const twitterTags = html.match(/<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi)
    
    if (twitterTags) {
      twitterTags.forEach((tag) => {
        const match = tag.match(/name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']/i)
        if (match) {
          const [, property, content] = match
          // Only use Twitter Card metadata if the property doesn't exist in Open Graph
          if (property === 'title' && (!ogData.title || ogData.title === url)) {
            ogData.title = content
          } else if (property === 'description' && (!ogData.description || ogData.description === `Content from ${domain}`)) {
            ogData.description = content
          } else if (property === 'image' && !ogData.image) {
            ogData.image = content
          }
        }
      })
    }
    
    return ogData
  }
  
  // Fallback data for when we can't fetch or parse the HTML
  const getDomainBasedFallbackData = (url: string, domain: string): OpenGraphData => {
    // Generate fallback data based on the domain
    let fallbackData: OpenGraphData = {
      title: url,
      description: `Content from ${domain}`,
      siteName: domain,
      url: url
    }
    
    // Add domain-specific mock data
    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      fallbackData = {
        title: 'Twitter / X Post',
        description: 'View this post on Twitter/X',
        image: 'https://abs.twimg.com/responsive-web/web/icon-default.3c3b2244.png',
        siteName: 'Twitter/X',
        url
      }
    } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      fallbackData = {
        title: 'YouTube Video',
        description: 'Watch this video on YouTube',
        image: 'https://www.youtube.com/img/desktop/yt_1200.png',
        siteName: 'YouTube',
        url
      }
    } else if (domain.includes('github.com')) {
      fallbackData = {
        title: 'GitHub Repository',
        description: 'View this repository on GitHub',
        image: 'https://github.githubassets.com/images/modules/open_graph/github-mark.png',
        siteName: 'GitHub',
        url
      }
    } else if (domain.includes('reddit.com')) {
      fallbackData = {
        title: 'Reddit Post',
        description: 'Join the discussion on Reddit',
        image: 'https://www.redditstatic.com/icon.png',
        siteName: 'Reddit',
        url
      }
    } else if (domain.includes('express.co.uk')) {
      fallbackData = {
        title: 'Express News Article',
        description: 'Read this article on Express',
        image: 'https://cdn.images.express.co.uk/img/dynamic/1/590x/secondary/express-logo-1921080.jpg',
        siteName: 'Express',
        url
      }
    }
    
    return fallbackData
  }
  
  if (isLoading) {
    return (
      <div className={`rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden ${className}`}>
        <div className="animate-pulse flex flex-col">
          <div className="h-24 bg-gray-200 dark:bg-gray-700"></div>
          <div className="p-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return null // Don't show anything if there's an error
  }
  
  // Check if this is a link-post preview (from className)
  const isLinkPost = className.includes('link-post-preview')
  
  // Render the link preview with the Open Graph data
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${className}`}
    >
      <div className={`relative ${isLinkPost ? 'h-48' : 'h-24'} bg-gray-100 dark:bg-gray-800`}>
        {ogData?.image ? (
          // If we have an image from OG data, display it
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${ogData.image})` }}></div>
        ) : (
          // Otherwise, show a domain-specific placeholder
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            {getDomainPlaceholder(domain)}
          </div>
        )}
      </div>
      <div className={`${isLinkPost ? 'p-3' : 'p-1.5'} bg-white dark:bg-gray-800`}>
        <div className={`${isLinkPost ? 'text-sm' : 'text-xs'} font-medium text-gray-800 dark:text-gray-200 ${isLinkPost ? 'line-clamp-2' : 'truncate'}`}>
          {ogData?.title || url}
        </div>
        {isLinkPost && ogData?.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
            {ogData.description}
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {ogData?.siteName || domain}
        </div>
      </div>
    </a>
  )
}

// Helper function to get domain-specific placeholders
const getDomainPlaceholder = (domain: string) => {
  // Remove www. prefix if present
  const cleanDomain = domain.replace(/^www\./, '');
  
  if (cleanDomain.includes('twitter.com') || cleanDomain.includes('x.com')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#1DA1F2">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
      </svg>
    );
  }
  
  if (cleanDomain.includes('youtube.com') || cleanDomain.includes('youtu.be')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
      </svg>
    );
  }
  
  if (cleanDomain.includes('github.com')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#181717">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
      </svg>
    );
  }
  
  if (cleanDomain.includes('reddit.com')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#FF4500">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"></path>
      </svg>
    );
  }
  
  if (cleanDomain.includes('express.co.uk')) {
    return (
      <div className="text-red-700 text-lg font-bold">
        EXPRESS
      </div>
    );
  }
  
  // For other domains, generate a color based on the domain name
  const hash = cleanDomain.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue = Math.abs(hash % 360);
  
  return (
    <div 
      className="text-white text-lg font-bold"
      style={{ color: `hsl(${hue}, 70%, 50%)` }}
    >
      {cleanDomain.charAt(0).toUpperCase()}
    </div>
  );
};