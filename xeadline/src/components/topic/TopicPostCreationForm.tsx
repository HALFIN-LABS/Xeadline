'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { eventManager } from '../../services/eventManagement'
import { uploadToBlob } from '../../lib/blob'
import { RootState } from '../../redux/store'
import { EVENT_TYPES } from '../../constants/eventTypes'
import { v4 as uuidv4 } from 'uuid' // For generating unique identifiers
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Tabs, Tab } from '../ui/Tabs'
import { Icon } from '../ui/Icon'
import { RichTextEditor } from '../editor/RichTextEditor'
import { MediaUploader } from '../editor/MediaUploader'
import { VideoEmbed, VideoEmbedData } from '../editor/VideoEmbed'
import { LinkUnfurler, LinkPreviewData } from '../editor/LinkUnfurler'
import { EmbeddedContent } from '../editor/EmbeddedContent'
import { MediaGallery } from '../editor/MediaGallery'

interface TopicPostCreationFormProps {
  topicId: string
  topicName: string
  topicRules: Array<{ title: string; description?: string }>
  onPostCreated?: () => void
  formRef?: (ref: any) => void
  hideButtons?: boolean
  darkMode?: boolean
}

type PostType = 'text' | 'media' | 'link' | 'poll'

export const TopicPostCreationForm: React.FC<TopicPostCreationFormProps> = ({
  topicId,
  topicName,
  topicRules,
  onPostCreated,
  formRef,
  hideButtons = false,
  darkMode = false
}) => {
  const [postType, setPostType] = useState<PostType>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaTypes, setMediaTypes] = useState<('image' | 'video' | 'gif')[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [embeddedContents, setEmbeddedContents] = useState<string[]>([]) // JSON strings of LinkPreviewData or VideoEmbedData
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUser = useSelector((state: RootState) => state.auth.currentUser)
  
  // UI state for media components
  const [showVideoEmbed, setShowVideoEmbed] = useState(false)
  const [showLinkUnfurler, setShowLinkUnfurler] = useState(false)
  const [showMediaGallery, setShowMediaGallery] = useState(false)
  
  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const gifInputRef = useRef<HTMLInputElement>(null)
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    console.log('Submitting form with title:', title)
    console.log('Post type:', postType)
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    
    if (postType === 'text' && !content.trim()) {
      setError('Content is required for text posts')
      return
    }
    
    if (postType === 'link' && !linkUrl.trim()) {
      setError('URL is required for link posts')
      return
    }
    
    if (postType === 'media' && mediaUrls.length === 0) {
      setError('At least one media item is required for media posts')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Prepare content based on post type
      let eventContent = ''
      let eventKind: number
      const uniqueId = uuidv4() // Generate a unique identifier for the 'd' tag
      let eventTags = [
        ['t', topicId], // Associate with topic
        ['d', uniqueId] // Add the 'd' tag required for addressable events
      ]
      
      // Add any user-selected tags
      tags.forEach(tag => {
        eventTags.push(['t', tag])
      })
      
      // Format content based on post type and set the appropriate event kind
      switch (postType) {
        case 'text':
          eventKind = EVENT_TYPES.TEXT_POST // 33301
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'text'
          })
          break
        case 'link':
          eventKind = EVENT_TYPES.LINK_POST // 33303
          eventContent = JSON.stringify({
            title,
            url: linkUrl,
            type: 'link',
            // Include link preview data if available
            linkPreview: embeddedContents.length > 0 ? embeddedContents[0] : undefined
          })
          
          // If we don't have a link preview yet, try to auto-unfurl the link
          if (embeddedContents.length === 0 && linkUrl) {
            // Set a flag to indicate we're submitting without a preview
            // This will allow the post to be created, but we'll try to fetch the preview
            // in the background and update the post later if possible
            console.log('Creating link post without preview, will try to fetch preview in background')
          }
          break
        case 'media':
          eventKind = EVENT_TYPES.MEDIA_POST // 33302
          eventContent = JSON.stringify({
            title,
            text: content,
            media: mediaUrls,
            mediaTypes: mediaTypes,
            thumbnails: thumbnails,
            embeds: embeddedContents,
            type: 'media'
          })
          break
        case 'poll':
          eventKind = EVENT_TYPES.POLL_POST // 33304
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'poll'
          })
          break
        default:
          eventKind = EVENT_TYPES.TEXT_POST // Default to text post
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'text'
          })
      }
      
      // Create post event using the EventManager with the appropriate kind
      const event = await eventManager.createEvent(
        eventKind, // Use custom event kind based on post type
        eventContent,
        eventTags
      )
      
      // Sign and publish with proper error handling
      const result = await eventManager.signAndPublishEvent(event)
      
      if (result.success) {
        // Reset form on success
        setTitle('')
        setContent('')
        setLinkUrl('')
        setMediaUrls([])
        setMediaTypes([])
        setThumbnails([])
        setEmbeddedContents([])
        setTags([])
        setError(null)
        
        // Reset UI states
        setShowVideoEmbed(false)
        setShowLinkUnfurler(false)
        setShowMediaGallery(false)
        
        // Call the onPostCreated callback if provided
        if (onPostCreated) {
          onPostCreated()
        }
        
        // Show success message or redirect
        console.log('Post created successfully!')
      } else {
        setError('Failed to publish post. Please try again.')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      setError('An error occurred while creating your post.')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, content, linkUrl, postType, topicId, tags, mediaUrls, mediaTypes, thumbnails, embeddedContents, onPostCreated])
  
  // Expose the submitForm method via formRef
  // Use useCallback to memoize the submitForm function
  const submitFormCallback = React.useCallback(() => handleSubmit(), [handleSubmit]);
  
  React.useEffect(() => {
    if (formRef) {
      formRef({
        submitForm: submitFormCallback
      });
    }
  }, [formRef, submitFormCallback]);
  
  // Media handlers
  const handleMediaUpload = useCallback((url: string, type: 'image' | 'video' | 'gif' | 'embed') => {
    if (type === 'embed') {
      // For embeds, the URL is actually a JSON string of LinkPreviewData or VideoEmbedData
      setEmbeddedContents(prev => [...prev, url])
    } else {
      // For media files, add to mediaUrls and track the media type
      setMediaUrls(prev => [...prev, url])
      setMediaTypes(prev => [...prev, type])
      
      // For videos, we could generate a thumbnail in the future
      if (type === 'video') {
        // For now, just add an empty placeholder
        setThumbnails(prev => [...prev, ''])
      }
    }
  }, [])
  
  // Handle video embed
  const handleVideoEmbed = useCallback((videoData: VideoEmbedData) => {
    const embedData = JSON.stringify(videoData)
    setEmbeddedContents(prev => [...prev, embedData])
    setShowVideoEmbed(false)
  }, [])
  
  // Handle link unfurl
  const handleLinkUnfurl = useCallback((linkData: LinkPreviewData) => {
    const embedData = JSON.stringify(linkData)
    setEmbeddedContents([embedData]) // Replace any existing embeds for link posts
    setShowLinkUnfurler(false)
  }, [])
  
  // Auto-unfurl link when modal is shown
  const handleShowLinkUnfurler = useCallback(() => {
    setShowLinkUnfurler(true)
    
    // If we're in link post mode and have a URL, pre-populate the unfurler
    if (postType === 'link' && linkUrl && linkUrl.trim()) {
      // This will be picked up by the LinkUnfurler component
      localStorage.setItem('prefill_link_url', linkUrl.trim())
    }
  }, [postType, linkUrl])
  
  // Debounced auto-unfurl for link tab
  useEffect(() => {
    if (postType === 'link' && linkUrl && linkUrl.trim() && !embeddedContents.length) {
      // Set a timeout to auto-unfurl after 0.8 seconds of no typing
      // Reduced from 1.5s to make it more responsive now that there's no manual button
      const timeoutId = setTimeout(() => {
        handleShowLinkUnfurler()
      }, 800)
      
      // Clear the timeout if the component unmounts or linkUrl changes
      return () => clearTimeout(timeoutId)
    }
  }, [postType, linkUrl, embeddedContents.length, handleShowLinkUnfurler])
  
  // This function was previously used for image cropping, but we've removed that functionality
  
  // Remove embedded content
  const handleRemoveEmbed = useCallback((index: number) => {
    setEmbeddedContents(prev => prev.filter((_, i) => i !== index))
  }, [])
  
  // State for upload progress
  const [isUploading, setIsUploading] = useState(false)
  
  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Sign in to post in {topicName}
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className={`${hideButtons || darkMode ? 'bg-transparent' : 'bg-white dark:bg-gray-800'} rounded-lg ${!hideButtons && !darkMode && 'shadow'} overflow-hidden`}>
          {!hideButtons && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Create post</h2>
            </div>
          )}
          
          <div className="p-2 w-full">
            <div className="flex items-center mb-2">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-green-600 dark:text-green-400">t/{topicName}</span>
              </div>
            </div>
            
            <Tabs className={`mb-4 ${darkMode ? 'bg-black/20 backdrop-blur-sm rounded-lg p-1 border-0 border-b-0' : 'border-0 border-b-0'}`}>
              <Tab
                label={<div className="flex items-center">Text <Icon name="file-text" className="ml-2" /></div>}
                active={postType === 'text'}
                onClick={() => setPostType('text')}
                className={darkMode ? 'text-white bg-black/30 hover:bg-black/40 border-gray-700/30' : ''}
              />
              <Tab
                label={<div className="flex items-center">Images & Video <Icon name="image" className="ml-2" /></div>}
                active={postType === 'media'}
                onClick={() => setPostType('media')}
                className={darkMode ? 'text-white bg-black/30 hover:bg-black/40 border-gray-700/30' : ''}
              />
              <Tab
                label={<div className="flex items-center">Link <Icon name="link" className="ml-2" /></div>}
                active={postType === 'link'}
                onClick={() => setPostType('link')}
                className={darkMode ? 'text-white bg-black/30 hover:bg-black/40 border-gray-700/30' : ''}
              />
              <Tab
                label={<div className="flex items-center">Poll <Icon name="bar-chart-2" className="ml-2" /></div>}
                active={postType === 'poll'}
                onClick={() => setPostType('poll')}
                className={darkMode ? 'text-white bg-black/30 hover:bg-black/40 border-gray-700/30' : ''}
              />
            </Tabs>
            
            <form onSubmit={handleSubmit} className="w-full">
              <div className="mb-4">
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className={`w-full ${darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 backdrop-blur-sm rounded-lg' : ''}`}
                  maxLength={300}
                  style={{ backgroundColor: darkMode ? 'transparent' : '' }}
                />
                <div className="text-xs text-gray-500 text-right mt-1">
                  {title.length}/300
                </div>
              </div>
              
              {postType === 'text' && (
                <div className="mb-4 w-full px-0">
                  <RichTextEditor
                    onChange={(text) => setContent(text)}
                    placeholder="Text (required)"
                    className={`w-full ${darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 rounded-lg' : ''}`}
                  />
                </div>
              )}
              
              {postType === 'media' && (
                <div className="mb-4">
                  <div className="flex flex-col gap-4">
                    {/* Use the MediaUploader component for all media uploads */}
                    <MediaUploader
                      topicId={topicId}
                      postId="new-post"
                      onUpload={handleMediaUpload}
                      darkMode={darkMode}
                    />
                    
                    <div className="flex items-center gap-2 mt-2">
                      {/* Link button */}
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/30 text-white border border-gray-700/30 hover:bg-black/50' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'} rounded-md backdrop-blur-sm`}
                        onClick={() => setShowLinkUnfurler(true)}
                      >
                        <Icon name="link" />
                        <span>Link</span>
                      </button>
                      
                      {/* Media Gallery button */}
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/30 text-white border border-gray-700/30 hover:bg-black/50' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'} rounded-md backdrop-blur-sm`}
                        onClick={() => setShowMediaGallery(true)}
                      >
                        <Icon name="image" />
                        <span>Gallery</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Max file sizes: Images/GIFs 10MB, Videos 150MB
                  </div>
                  
                  {/* Image cropper modal has been removed - we now upload images directly */}
                  
                  {/* Link unfurler modal */}
                  {showLinkUnfurler && (
                    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/80' : 'bg-gray-800/80'}`}>
                      <div className={`relative w-full max-w-lg p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowLinkUnfurler(false)}
                        >
                          ✕
                        </button>
                        <LinkUnfurler
                          onUnfurl={handleLinkUnfurl}
                          darkMode={darkMode}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Video embed modal */}
                  {showVideoEmbed && (
                    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/80' : 'bg-gray-800/80'}`}>
                      <div className={`relative w-full max-w-lg p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowVideoEmbed(false)}
                        >
                          ✕
                        </button>
                        <VideoEmbed
                          onEmbed={handleVideoEmbed}
                          darkMode={darkMode}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Media Gallery modal */}
                  {showMediaGallery && currentUser && (
                    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/80' : 'bg-gray-800/80'}`}>
                      <div className={`relative w-full max-w-4xl p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowMediaGallery(false)}
                        >
                          ✕
                        </button>
                        <MediaGallery
                          userId={typeof currentUser === 'object' ? (currentUser as any).pubkey || '' : ''}
                          topicId={topicId}
                          onSelect={(media) => {
                            handleMediaUpload(media.url, media.mediaType as any);
                            setShowMediaGallery(false);
                          }}
                          darkMode={darkMode}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Display uploaded media */}
                  {mediaUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {mediaUrls.map((url, index) => (
                        <div key={`media-${index}`} className="relative">
                          {url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('video') ? (
                            <video
                              src={url}
                              controls
                              preload="metadata"
                              playsInline
                              className="w-full h-48 object-contain rounded-md bg-black"
                              onError={(e) => {
                                console.error('Video load error:', e);
                                // Try to reload the video if it fails to load
                                const video = e.currentTarget;
                                video.load();
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <img
                              src={url}
                              alt={`Uploaded media ${index + 1}`}
                              className="w-full h-48 object-contain rounded-md"
                            />
                          )}
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                            onClick={() => {
                              // Remove the media URL, type, and thumbnail at this index
                              setMediaUrls(prev => prev.filter((_, i) => i !== index));
                              setMediaTypes(prev => prev.filter((_, i) => i !== index));
                              setThumbnails(prev => prev.filter((_, i) => i !== index));
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display embedded content */}
                  {embeddedContents.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {embeddedContents.map((content, index) => (
                        <EmbeddedContent
                          key={`embed-${index}`}
                          content={content}
                          onRemove={() => handleRemoveEmbed(index)}
                          darkMode={darkMode}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <RichTextEditor
                      onChange={(text) => setContent(text)}
                      placeholder="Add a caption (optional)"
                      className={`w-full ${darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 rounded-lg' : ''}`}
                    />
                  </div>
                </div>
              )}
              
              {postType === 'link' && (
                <div className="mb-4">
                  <Input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setLinkUrl(newUrl);
                      
                      // Clear existing link previews when URL changes
                      if (newUrl !== linkUrl) {
                        setEmbeddedContents([]);
                      }
                    }}
                    placeholder="URL"
                    className={`w-full ${darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 backdrop-blur-sm rounded-lg' : ''}`}
                    style={{ backgroundColor: darkMode ? 'transparent' : '' }}
                    onBlur={() => {
                      // Auto-unfurl link when user finishes typing
                      if (linkUrl && linkUrl.trim() && !embeddedContents.length) {
                        handleShowLinkUnfurler();
                      }
                    }}
                  />
                  
                  {/* Display link preview if available */}
                  {embeddedContents.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {embeddedContents.map((content, index) => (
                        <EmbeddedContent
                          key={`embed-${index}`}
                          content={content}
                          onRemove={() => handleRemoveEmbed(index)}
                          darkMode={darkMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {postType === 'poll' && (
                <div className="mb-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-center text-gray-600 dark:text-gray-400">
                      Poll creation will be available soon
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <button
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/30 text-white border border-gray-700/30 hover:bg-black/50' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'} rounded-md backdrop-blur-sm`}
                >
                  <Icon name="tag" />
                  <span>Add tags</span>
                </button>
              </div>
              
              {error && (
                <div className={`text-red-500 text-sm mb-4 ${darkMode ? 'bg-black/20 p-2 rounded-lg border border-red-500/30' : ''}`}>
                  {error}
                </div>
              )}
              
              {!hideButtons && (
                <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="mr-2"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    Post
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      
      {/* Sidebar with rules - only show in standalone mode, not in modal */}
      {!hideButtons && (
        <div className="lg:w-80">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">Posting to t/{topicName}</h3>
            
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {topicRules.map((rule, index) => (
                <li key={index}>
                  <span className="font-medium">{rule.title}</span>
                  {rule.description && (
                    <p className="text-gray-600 dark:text-gray-400 ml-5 mt-1">
                      {rule.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}