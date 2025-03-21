'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { storageService } from '../../services/storage'

interface MediaItem {
  id: string
  url: string
  contentType: string
  fileName: string
  uploadedAt: string
  mediaType: 'image' | 'video' | 'gif' | 'embed'
}

interface MediaGalleryProps {
  userId: string
  topicId?: string
  postId?: string
  onSelect?: (media: MediaItem) => void
  darkMode?: boolean
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  userId,
  topicId,
  postId,
  onSelect,
  darkMode = false
}) => {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'gif'>('all')

  // Load user's media
  useEffect(() => {
    const loadMedia = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Build filter prefix based on props
        let prefix = `user/${userId}/`;
        
        if (topicId) {
          prefix += `topic/${topicId}/`;
        }
        
        if (postId) {
          prefix += `post/${postId}/`;
        }
        
        // List media files using the storage service
        const mediaIds = await storageService.list({
          prefix,
          limit: 50 // Limit to 50 items for performance
        });
        
        // Fetch metadata for each media item
        const mediaItems: MediaItem[] = [];
        
        for (const id of mediaIds) {
          try {
            // This is a simplified approach - in a real implementation,
            // we would batch these requests or have an API endpoint to get metadata
            const url = storageService.getUrl(id);
            const metadata = await fetchMediaMetadata(id);
            
            if (metadata) {
              mediaItems.push({
                id,
                url,
                contentType: metadata.contentType || '',
                fileName: metadata.fileName || '',
                uploadedAt: metadata.uploadedAt || new Date().toISOString(),
                mediaType: determineMediaType(metadata.contentType || '')
              });
            }
          } catch (err) {
            console.error(`Error fetching metadata for ${id}:`, err);
          }
        }
        
        // Sort by upload date (newest first)
        mediaItems.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        
        setMedia(mediaItems);
      } catch (error) {
        console.error('Error loading media gallery:', error);
        setError('Failed to load media. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMedia();
  }, [userId, topicId, postId]);

  // Determine media type from content type
  const determineMediaType = (contentType: string): 'image' | 'video' | 'gif' | 'embed' => {
    if (contentType.startsWith('image/gif')) return 'gif';
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    return 'embed';
  };

  // Fetch metadata for a media item (placeholder implementation)
  const fetchMediaMetadata = async (id: string): Promise<Record<string, string> | null> => {
    // In a real implementation, this would call an API endpoint to get metadata
    // For now, we'll return mock data based on the ID
    return {
      contentType: id.includes('video') ? 'video/mp4' : 'image/jpeg',
      fileName: `file-${id.substring(0, 8)}.${id.includes('video') ? 'mp4' : 'jpg'}`,
      uploadedAt: new Date().toISOString(),
      mediaType: id.includes('video') ? 'video' : 'image'
    };
  };

  // Handle media selection
  const handleSelect = (item: MediaItem) => {
    setSelectedMedia(item.id);
    if (onSelect) {
      onSelect(item);
    }
  };

  // Filter media items based on selected filter
  const filteredMedia = filter === 'all' 
    ? media 
    : media.filter(item => item.mediaType === filter);

  return (
    <div className={`media-gallery ${darkMode ? 'text-white' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Media</h3>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
            className={darkMode ? 'bg-black/30 border-gray-700/30 hover:bg-black/50' : ''}
          >
            All
          </Button>
          <Button
            variant={filter === 'image' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('image')}
            className={darkMode ? 'bg-black/30 border-gray-700/30 hover:bg-black/50' : ''}
          >
            <Icon name="image" className="mr-1" />
            Images
          </Button>
          <Button
            variant={filter === 'video' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('video')}
            className={darkMode ? 'bg-black/30 border-gray-700/30 hover:bg-black/50' : ''}
          >
            <Icon name="video" className="mr-1" />
            Videos
          </Button>
          <Button
            variant={filter === 'gif' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('gif')}
            className={darkMode ? 'bg-black/30 border-gray-700/30 hover:bg-black/50' : ''}
          >
            <Icon name="gift" className="mr-1" />
            GIFs
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : error ? (
        <div className={`text-red-500 text-center p-4 ${darkMode ? 'bg-black/20 rounded-lg border border-red-500/30' : ''}`}>
          {error}
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          {filter === 'all' 
            ? 'No media found. Upload some media to see it here.' 
            : `No ${filter} files found.`}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {filteredMedia.map(item => (
            <div 
              key={item.id}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-2 ${
                selectedMedia === item.id 
                  ? 'border-green-500' 
                  : darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
              onClick={() => handleSelect(item)}
            >
              {item.mediaType === 'video' ? (
                <div className="relative aspect-video bg-gray-900">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    playsInline
                    muted
                    onError={(e) => {
                      console.error('Video thumbnail load error:', e);
                      // Try to reload the video if it fails to load
                      const video = e.currentTarget;
                      video.load();
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="play" className="text-white text-3xl opacity-80" />
                  </div>
                </div>
              ) : item.mediaType === 'gif' ? (
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={item.url} 
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                    GIF
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={item.url} 
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {selectedMedia === item.id && (
                <div className="absolute top-1 left-1 bg-green-500 text-white rounded-full p-1">
                  <Icon name="check" className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}