'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { eventManager } from '../../services/eventManagement'
import { RootState } from '../../redux/store'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Tabs, Tab } from '../ui/Tabs'
import { Icon } from '../ui/Icon'
import { RichTextEditor } from '../editor/RichTextEditor'
import { MediaUploader } from '../editor/MediaUploader'

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
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUser = useSelector((state: RootState) => state.auth.currentUser)
  
  // Expose the submitForm method via formRef
  React.useEffect(() => {
    if (formRef) {
      formRef({
        submitForm: () => handleSubmit()
      });
    }
  }, [formRef]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
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
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Prepare content based on post type
      let eventContent = ''
      let eventTags = [['t', topicId]] // Associate with topic
      
      // Add any user-selected tags
      tags.forEach(tag => {
        eventTags.push(['t', tag])
      })
      
      // Format content based on post type
      switch (postType) {
        case 'text':
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'text'
          })
          break
        case 'link':
          eventContent = JSON.stringify({
            title,
            url: linkUrl,
            type: 'link'
          })
          break
        case 'media':
          eventContent = JSON.stringify({
            title,
            text: content,
            media: mediaUrls,
            type: 'media'
          })
          break
        case 'poll':
          // Poll options would be collected and included here
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'poll'
          })
          break
      }
      
      // Create post event using the EventManager
      const event = await eventManager.createEvent(
        1, // kind 1 = text note
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
        setTags([])
        setError(null)
        
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
  }
  
  const handleMediaUpload = (url: string) => {
    setMediaUrls(prev => [...prev, url])
  }
  
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
          
          <div className="p-2">
            <div className="flex items-center mb-2">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-green-600 dark:text-green-400">t/{topicName}</span>
              </div>
            </div>
            
            <Tabs className={`mb-4 ${darkMode ? 'bg-black/20 backdrop-blur-sm rounded-lg p-1' : ''}`}>
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
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className={`w-full ${darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 backdrop-blur-sm rounded-lg' : ''}`}
                  maxLength={300}
                />
                <div className="text-xs text-gray-500 text-right mt-1">
                  {title.length}/300
                </div>
              </div>
              
              {postType === 'text' && (
                <div className="mb-4">
                  <RichTextEditor
                    onChange={(text) => setContent(text)}
                    placeholder="Text (optional)"
                    className={darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 rounded-lg' : ''}
                  />
                </div>
              )}
              
              {postType === 'media' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            // This will be handled by the MediaUploader component
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/jpeg,image/png,image/webp';
                            fileInput.onchange = (event) => {
                              const target = event.target as HTMLInputElement;
                              if (target.files && target.files[0]) {
                                const mediaUploader = document.querySelector('input[accept="image/jpeg,image/png,image/webp"]') as HTMLInputElement;
                                if (mediaUploader) {
                                  Object.defineProperty(mediaUploader, 'files', {
                                    value: target.files,
                                    writable: true
                                  });
                                  mediaUploader.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                              }
                            };
                            fileInput.click();
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/30 text-white border border-gray-700/30 hover:bg-black/50' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'} rounded-md backdrop-blur-sm`}
                      >
                        <Icon name="image" />
                        <span>Image</span>
                      </button>
                    </label>
                    
                    <button
                      type="button"
                      className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/30 text-white border border-gray-700/30 hover:bg-black/50' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'} rounded-md backdrop-blur-sm`}
                      disabled
                    >
                      <Icon name="video" />
                      <span>Video</span>
                    </button>
                    
                    <button
                      type="button"
                      className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-black/30 text-white border border-gray-700/30 hover:bg-black/50' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'} rounded-md backdrop-blur-sm`}
                      disabled
                    >
                      <Icon name="link" />
                      <span>Link</span>
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Max file sizes: Images 10MB (Videos 150MB coming soon)
                  </div>
                  
                  <MediaUploader
                    topicId={topicId}
                    onUpload={handleMediaUpload}
                    darkMode={darkMode}
                    hideButtons={true}
                  />
                  
                  {mediaUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {mediaUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url} 
                            alt={`Uploaded media ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                            onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== index))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <RichTextEditor
                      onChange={(text) => setContent(text)}
                      placeholder="Add a caption (optional)"
                      className={darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 rounded-lg' : ''}
                    />
                  </div>
                </div>
              )}
              
              {postType === 'link' && (
                <div className="mb-4">
                  <Input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="URL"
                    className={`w-full ${darkMode ? 'bg-black/30 border-gray-700/30 text-white placeholder-gray-400 backdrop-blur-sm rounded-lg' : ''}`}
                  />
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