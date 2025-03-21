# Content Management Implementation Plan

## Overview

This document outlines the implementation plan for Phase 2.1 Content Management Completion from the MVP Implementation Plan. The goal is to complete the content creation and management system with comprehensive rich media support, advanced formatting options, and an intelligent preview system.

## Current Status Analysis

After examining the codebase, we've identified the following:

1. **Post Creation**:
   - Posts can only be created within a topic (similar to a subreddit)
   - The topic page has a post creation button but no implementation
   - Each post must be associated with a topic for filtering
   - Current post creation is limited to plain text with minimal formatting

2. **Media Support**:
   - Basic image upload exists but is not integrated with post creation
   - No support for other media types or embedding

3. **Preview System**:
   - No content preview system exists
   - Users cannot see how their post will appear before publishing

4. **Content Rendering**:
   - Basic rendering of text content
   - Limited support for formatting and media display

## Implementation Strategy

We'll implement the content management system in five phases:

### Phase 1: Topic Page Post Creation (1 Week)

Implement post creation functionality on topic pages, using the visual styling (buttons, UI elements, and design patterns) from the home, all, and discover pages for consistency.

**Tasks**:
1. Create PostCreationForm component for topic pages
2. Implement topic-specific post creation logic
3. Connect to EventManager for post publishing
4. Add proper error handling and loading states
5. Ensure consistent styling with existing pages

### ~~Phase 2: Rich Text Editor (1 Week)~~ [DEFERRED]

**Note: Phase 2 implementation has been deferred due to integration issues encountered in previous attempts. We will continue using the simplified text editor for now.**

~~Implement a full-featured rich text editor with formatting controls.~~

~~**Tasks**:~~
~~1. Evaluate and integrate a rich text editor library (e.g., Slate, TipTap, or Lexical)~~
~~2. Implement basic formatting controls (bold, italic, lists, links)~~
~~3. Add support for code blocks with syntax highlighting~~
~~4. Create custom formatting options specific to Xeadline~~
~~5. Ensure accessibility compliance~~

### Phase 3: Media Integration (1 Week)

Add comprehensive media support to the post creation flow.

**Tasks**:
1. Enhance image upload with preview, cropping, and optimization (limit to 10MB)
2. Implement direct video uploads (mp4, mov formats, limit to 150MB)
3. Add support for embedding videos from YouTube, Vimeo, etc.
4. Implement GIF support for posts and comments
5. Implement link unfurling for rich previews
6. Create media gallery for managing uploaded content
7. Integrate with the Storage Service for media handling
8. Implement media compression for optimized delivery

### Phase 4: Preview System (1 Week)

Implement an intelligent preview system that shows how content will appear.

**Tasks**:
1. Create a preview component that renders content exactly as it will appear
2. Implement real-time preview updates as content is edited
3. Add preview modes for different contexts (feed, detail view)
4. Ensure preview accurately reflects different device sizes
5. Implement content validation and feedback

### Phase 5: Comment System & Voting (1 Week)

Implement a comprehensive comment system for posts with voting functionality.

**Tasks**:
1. Create comment creation component with rich text support
2. Implement nested comment threading
3. Add media support in comments (images, GIFs, videos)
4. Implement comment sorting and pagination
5. Add comment moderation tools
6. Implement real-time comment updates
7. Add upvote/downvote functionality for posts
8. Add upvote/downvote functionality for comments
9. Implement vote counting and sorting by votes
10. Implement post detail page layout with Reddit-like UI

### Phase 6: Post Detail Page Layout (1 Week)

Implement a comprehensive post detail page layout that follows Reddit-like UI patterns.

**Tasks**:
1. Create a post detail layout with main content and sidebar
2. Implement post action bar with voting, comment count, zap, and share buttons
3. Add quick comment input directly below the post
4. Implement comment sorting with "Most liked" as default option
5. Add sorting options for "Newest", "Oldest", and "Most disliked"
6. Create sidebar with topic information, moderators, and rules
7. Ensure consistent styling with the home page post cards
8. Implement responsive design for various screen sizes

## Technical Design

### 1. Content Data Model

```typescript
interface RichContent {
  text: string;
  format: 'plain' | 'markdown' | 'html';
  formatting: FormattingOptions[];
  media: MediaItem[];
  mentions: UserMention[];
  tags: string[];
  metadata: Record<string, any>;
}

interface MediaItem {
  type: 'image' | 'video' | 'gif' | 'embed' | 'link';
  url: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  fileSize?: number; // Size in bytes
  metadata?: Record<string, any>;
}

interface FormattingOptions {
  type: 'bold' | 'italic' | 'link' | 'code' | 'heading' | 'list';
  range: [number, number]; // Start and end positions in text
  data?: any; // Additional data like URL for links
}
```

### 2. Component Architecture

```
ContentCreationSystem
├── RichTextEditor
│   ├── FormattingToolbar
│   ├── TextArea
│   └── FormattingControls
├── MediaUploader
│   ├── ImageUploader
│   ├── VideoUploader
│   ├── GifUploader
│   └── LinkUnfurler
├── ContentPreview
│   ├── PreviewRenderer
│   └── DevicePreviewSelector
├── PublishControls
│   ├── ValidationFeedback
│   ├── PrivacySettings
│   └── PublishButton
├── CommentSystem
│   ├── CommentForm
│   ├── CommentList
│   ├── CommentItem
│   ├── CommentSorting
│   ├── VoteButton
│   └── VoteCounter
└── PostDetailLayout
    ├── PostContent
    ├── PostActionBar
    │   ├── VoteControls
    │   ├── CommentCount
    │   ├── ZapButton
    │   └── ShareButton
    ├── QuickCommentInput
    ├── CommentSortControls
    └── TopicSidebar
        ├── TopicInfo
        ├── ModeratorList
        └── TopicRules
```

### 3. Service Architecture

```typescript
class ContentManager {
  constructor(
    private eventManager: EventManager,
    private storageService: StorageService,
    private previewGenerator: PreviewGenerator,
    private validationService: ValidationService
  ) {}

  async createPost(content: RichContent, topicId?: string): Promise<Post> {
    // Validate content
    await this.validationService.validate(content);
    
    // Process rich content
    const processedContent = await this.processRichContent(content);
    
    // Generate preview
    const preview = this.previewGenerator.generate(processedContent);
    
    // Create post event
    const postEvent = {
      kind: topicId ? 1 : 1, // Regular post or topic-specific post
      tags: [
        ...(topicId ? [['t', topicId]] : []),
        ...content.tags.map(tag => ['t', tag]),
        ...content.mentions.map(mention => ['p', mention.pubkey])
      ],
      content: JSON.stringify({
        text: processedContent.text,
        media: processedContent.media,
        preview
      })
    };
    
    // Sign and publish
    return this.eventManager.signAndPublish(postEvent);
  }
  
  private async processRichContent(content: RichContent): Promise<ProcessedContent> {
    // Handle text formatting
    const formattedText = this.formatText(content.text, content.formatting);
    
    // Process embedded media
    const processedMedia = await Promise.all(
      content.media.map(m => this.processMedia(m))
    );
    
    return {
      text: formattedText,
      media: processedMedia,
      mentions: content.mentions,
      tags: content.tags
    };
  }
  
  private async processMedia(media: MediaItem): Promise<ProcessedMediaItem> {
    switch (media.type) {
      case 'image':
        return this.processImage(media);
      case 'video':
        return this.processVideo(media);
      case 'embed':
        return this.processEmbed(media);
      case 'link':
        return this.processLink(media);
      default:
        return media;
    }
  }
}
```
### 4. Integration with Existing Systems

#### 4.1 Event Management System Integration

The Content Management System will leverage the centralized Event Management System (as described in `src/services/eventManagement/README.md`) for all event operations. This integration provides several key benefits:

- **Centralized Event Handling**: All content-related events (posts, comments, votes) will be processed through the unified EventManager
- **Comprehensive Validation**: Events will be validated against Nostr specifications and application requirements
- **Reliable Publishing**: Smart retry logic and relay selection ensures content is published successfully
- **Queue Management**: High-priority content operations can be prioritized using the QueueManager
- **Monitoring and Metrics**: Track content publishing success rates and performance

**Implementation Details**:

```typescript
import { eventManager, Priority } from '@/services/eventManagement';

// Create a post event with topic association
const event = await eventManager.createEvent(
  1, // kind 1 = text note
  JSON.stringify({ 
    title: "My Post Title",
    text: processedContent.text, 
    media: processedMedia 
  }),
  [['t', topicId]] // Associate with topic
);

// Sign and publish with proper error handling and priority
const result = await eventManager.signAndPublishEvent(event, {
  priority: Priority.NORMAL, // Use HIGH for important announcements
  retries: 3 // Number of retry attempts if publishing fails
});

// Handle the result
if (result.success) {
  // Post published successfully
  console.log(`Post published to ${result.publishedTo.length} relays`);
} else if (result.needsPassword) {
  // Show password modal for encrypted key signing
  const password = await showPasswordModal();
  const retryResult = await eventManager.signAndPublishEvent(event, {
    password,
    priority: Priority.NORMAL
  });
} else {
  // Handle error
  console.error(`Failed to publish post: ${result.error}`);
}

// For monitoring content publishing performance
const metrics = eventManager['eventMonitor'].getMetrics();
console.log(`Content publishing success rate: ${metrics.publishSuccessRate * 100}%`);
```

#### 4.2 Storage Service Integration

The Content Management System will use the Storage Service abstraction (as described in `src/services/storage/README.md`) for all media uploads. This integration provides several key benefits:

- **Provider Abstraction**: Media uploads work with any storage provider
- **Caching Support**: Frequently accessed media is cached for improved performance
- **Consistent API**: Unified API for all file operations
- **Metadata Support**: Rich metadata for organizing and filtering media
- **Error Handling**: Comprehensive error handling for upload failures

**Implementation Details**:

```typescript
import { storageService } from '@/services/storage';

// Upload image with proper metadata and caching
const result = await storageService.store(file, {
  contentType: file.type,
  metadata: {
    fileName: file.name,
    postId: postId || 'new-post',
    topicId: topicId,
    userId: currentUser.id,
    mediaType: 'post-image',
    uploadedAt: new Date().toISOString()
  },
  cacheControl: 'public, max-age=31536000', // Cache for 1 year
  ttl: 3600 // Cache in memory for 1 hour
});

// Get optimized URL for different sizes
const thumbnailUrl = storageService.getUrl(result.id, { width: 200, height: 200 });
const fullSizeUrl = storageService.getUrl(result.id);

// List user's uploaded media for media gallery
const userMedia = await storageService.list({
  prefix: `user/${currentUser.id}/`,
  limit: 20
});

// Delete media if needed
await storageService.delete(mediaId);
```

#### 4.3 UI Integration

The Content Management System will integrate with the existing UI components and styles:

- **Consistent Design Language**: Match the bottle green theme and existing UI patterns
- **Responsive Design**: Ensure proper display on all device sizes
- **Accessibility**: Maintain WCAG compliance for all new components
- **Performance**: Optimize rendering and minimize layout shifts

## Implementation Details

### Phase 1: Topic Page Post Creation

#### 1.1 PostCreationForm Component

Create a new component for topic page post creation that matches the existing UI:

```tsx
// src/components/topic/TopicPostCreationForm.tsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { eventManager } from '@/services/eventManagement';
import { RootState } from '@/redux/store';
import { Button, TextArea, Input, Tabs, Tab, Icon } from '@/components/ui';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaUploader } from '@/components/editor/MediaUploader';

interface TopicPostCreationFormProps {
  topicId: string;
  topicName: string;
  topicRules: Array<{ title: string; description?: string }>;
}

type PostType = 'text' | 'media' | 'link' | 'poll';

export const TopicPostCreationForm: React.FC<TopicPostCreationFormProps> = ({
  topicId,
  topicName,
  topicRules
}) => {
  const [postType, setPostType] = useState<PostType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (postType === 'text' && !content.trim()) {
      setError('Content is required for text posts');
      return;
    }
    
    if (postType === 'link' && !linkUrl.trim()) {
      setError('URL is required for link posts');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare content based on post type
      let eventContent = '';
      let eventTags = [['t', topicId]]; // Associate with topic
      
      // Add any user-selected tags
      tags.forEach(tag => {
        eventTags.push(['t', tag]);
      });
      
      // Format content based on post type
      switch (postType) {
        case 'text':
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'text'
          });
          break;
        case 'link':
          eventContent = JSON.stringify({
            title,
            url: linkUrl,
            type: 'link'
          });
          break;
        case 'media':
          // Media uploads would be handled separately and referenced here
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'media'
          });
          break;
        case 'poll':
          // Poll options would be collected and included here
          eventContent = JSON.stringify({
            title,
            text: content,
            type: 'poll'
          });
          break;
      }
      
      // Create post event using the EventManager
      const event = await eventManager.createEvent(
        1, // kind 1 = text note
        eventContent,
        eventTags
      );
      
      // Sign and publish with proper error handling
      const result = await eventManager.signAndPublishEvent(event);
      
      if (result.success) {
        // Reset form on success
        setTitle('');
        setContent('');
        setLinkUrl('');
        setTags([]);
      } else {
        setError('Failed to publish post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('An error occurred while creating your post.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Sign in to post in {topicName}
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Create post</h2>
          </div>
          
          <div className="p-2">
            <div className="flex items-center mb-2">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-green-600 dark:text-green-400">t/{topicName}</span>
              </div>
            </div>
            
            <Tabs className="mb-4">
              <Tab
                label={<div className="flex items-center"><Icon name="file-text" className="mr-2" />Text</div>}
                active={postType === 'text'}
                onClick={() => setPostType('text')}
              />
              <Tab
                label={<div className="flex items-center"><Icon name="image" className="mr-2" />Images & Video</div>}
                active={postType === 'media'}
                onClick={() => setPostType('media')}
              />
              <Tab
                label={<div className="flex items-center"><Icon name="link" className="mr-2" />Link</div>}
                active={postType === 'link'}
                onClick={() => setPostType('link')}
              />
              <Tab
                label={<div className="flex items-center"><Icon name="bar-chart-2" className="mr-2" />Poll</div>}
                active={postType === 'poll'}
                onClick={() => setPostType('poll')}
              />
            </Tabs>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full"
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
                  />
                </div>
              )}
              
              {postType === 'media' && (
                <div className="mb-4">
                  <MediaUploader
                    topicId={topicId}
                  />
                  <TextArea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Add a caption (optional)"
                    className="w-full mt-4"
                  />
                </div>
              )}
              
              {postType === 'link' && (
                <div className="mb-4">
                  <Input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="URL"
                    className="w-full"
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400"
                >
                  <Icon name="tag" className="mr-1" />
                  Add tags
                </Button>
              </div>
              
              {error && (
                <div className="text-red-500 text-sm mb-4">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                <Button
                  type="button"
                  variant="outline"
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
            </form>
          </div>
        </div>
      </div>
      
      {/* Sidebar with rules */}
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
    </div>
  );
};
```

#### 1.2 Integration with Topic Page

Update the topic page to include the post creation form:

```tsx
// src/app/t/[slug]/page.tsx
import { TopicPostCreationForm } from '@/components/topic/TopicPostCreationForm';

// Inside the component
return (
  <div>
    <TopicHeader topic={topic} />
    
    <div className="container mx-auto px-4">
      <TopicPostCreationForm
        topicId={topic.id}
        topicName={topic.name}
        topicRules={topic.rules || [
          { title: "Be respectful to others", description: "Treat others as you would like to be treated" },
          { title: "No spam or self-promotion", description: "Don't post content solely to promote yourself or your business" },
          { title: "Stay on topic", description: "Posts should be relevant to this community" }
        ]}
      />
      
      <TopicFeed topicId={topic.id} />
    </div>
  </div>
);
```

### Phase 2: Basic Text Editor Improvements

Instead of implementing a full-featured rich text editor with an external library (which caused issues in previous attempts), we'll improve the existing basic text editor:

```tsx
// src/components/editor/RichTextEditor.tsx
'use client'

import React, { useState } from 'react'
import { TextArea } from '../ui/TextArea'

interface RichTextEditorProps {
  onChange: (text: string) => void
  placeholder?: string
  initialContent?: string
  className?: string
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onChange,
  placeholder = 'Write something...',
  initialContent = '',
  className = ''
}) => {
  const [content, setContent] = useState(initialContent)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    onChange(newContent)
  }

  // Apply basic formatting functions
  const applyBold = () => {
    // Simple implementation - just adds ** around selected text
    // This is a placeholder for future implementation
    console.log('Bold formatting clicked')
  }

  const applyItalic = () => {
    // Simple implementation - just adds * around selected text
    // This is a placeholder for future implementation
    console.log('Italic formatting clicked')
  }

  const applyLink = () => {
    // Simple implementation - just adds [](url) around selected text
    // This is a placeholder for future implementation
    console.log('Link formatting clicked')
  }

  return (
    <div className={`rich-text-editor border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden relative z-10 ${className}`}>
      <div className="editor-toolbar border-b border-gray-300 dark:border-gray-700 p-2 flex items-center space-x-2">
        <button
          type="button"
          className="p-1 rounded hover:bg-black/20"
          title="Bold"
          onClick={applyBold}
        >
          <span className="font-bold">B</span>
        </button>
        <button
          type="button"
          className="p-1 rounded hover:bg-black/20"
          title="Italic"
          onClick={applyItalic}
        >
          <span className="italic">I</span>
        </button>
        <button
          type="button"
          className="p-1 rounded hover:bg-black/20"
          title="Link"
          onClick={applyLink}
        >
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </span>
        </button>
      </div>
      <TextArea
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-none focus:ring-0 min-h-[150px] p-3 bg-transparent"
      />
    </div>
  )
}
```

### Phase 3: Media Integration

Implement media upload and embedding:

```tsx
// src/components/editor/MediaUploader.tsx
import React, { useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { $createImageNode } from './nodes/ImageNode';
import { storageService } from '@/services/storage';
import { Button, Icon } from '@/components/ui';

interface MediaUploaderProps {
  topicId: string;
  postId?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ topicId, postId }) => {
  const [editor] = useLexicalComposerContext();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle media file uploads (images, videos, GIFs)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'gif') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size limits
    const fileSizeInMB = file.size / (1024 * 1024);
    const sizeLimit = type === 'video' ? 150 : 10; // 150MB for videos, 10MB for images/GIFs
    
    if (fileSizeInMB > sizeLimit) {
      setError(`File too large. ${type === 'video' ? 'Videos' : 'Images'} must be under ${sizeLimit}MB.`);
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Determine media type for metadata
      const mediaType = type === 'image' ? 'image' :
                        type === 'gif' ? 'gif' : 'video';
      
      // Upload media using storage service with proper metadata
      const result = await storageService.store(file, {
        contentType: file.type,
        metadata: {
          fileName: file.name,
          topicId,
          postId: postId || 'new-post',
          mediaType,
          uploadedAt: new Date().toISOString()
        }
      });
      
      // Insert media into editor based on type
      editor.update(() => {
        const selection = $getSelection();
        
        if ($isRangeSelection(selection)) {
          selection.insertParagraph();
          
          if (type === 'image' || type === 'gif') {
            // Insert image or GIF
            const imageNode = $createImageNode({
              src: result.url,
              altText: file.name,
              width: 'auto',
              height: 'auto',
              key: result.id,
              showCaption: true,
              caption: ''
            });
            selection.insertNodes([imageNode]);
          } else if (type === 'video') {
            // Insert video
            const videoNode = $createVideoNode({
              src: result.url,
              width: 'auto',
              height: 'auto',
              key: result.id,
              showControls: true,
              autoPlay: false
            });
            selection.insertNodes([videoNode]);
          }
        }
      });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setError(`Failed to upload ${type}. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Specific handlers for each media type
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleMediaUpload(e, 'image');
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleMediaUpload(e, 'video');
  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleMediaUpload(e, 'gif');
  
  return (
    <div className="media-uploader">
      <div className="flex items-center">
        {/* Image upload */}
        <label className="cursor-pointer mr-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            isLoading={isUploading}
            disabled={isUploading}
            title="Upload image (max 10MB)"
          >
            <Icon name="image" className="mr-1" />
            Image
          </Button>
        </label>
        
        {/* Video upload */}
        <label className="cursor-pointer mr-2">
          <input
            type="file"
            accept="video/mp4,video/quicktime"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            isLoading={isUploading}
            disabled={isUploading}
            title="Upload video (max 150MB)"
          >
            <Icon name="video" className="mr-1" />
            Video
          </Button>
        </label>
        
        {/* GIF upload */}
        <label className="cursor-pointer mr-2">
          <input
            type="file"
            accept="image/gif"
            onChange={handleGifUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            isLoading={isUploading}
            disabled={isUploading}
            title="Upload GIF (max 10MB)"
          >
            <Icon name="gift" className="mr-1" />
            GIF
          </Button>
        </label>
        
        {/* Link embedding */}
        <Button variant="ghost" size="sm">
          <Icon name="link" className="mr-1" />
          Link
        </Button>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
      
      {/* File size information */}
      <div className="text-xs text-gray-500 mt-1">
        Max file sizes: Images/GIFs 10MB, Videos 150MB
      </div>
    </div>
  );
};
```

### Phase 4: Preview System

Implement the content preview system:

```tsx
// src/components/editor/ContentPreview.tsx
import React, { useState, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';
import { Button, Tabs, Tab } from '@/components/ui';

interface ContentPreviewProps {
  onClose: () => void;
}

export const ContentPreview: React.FC<ContentPreviewProps> = ({ onClose }) => {
  const [editor] = useLexicalComposerContext();
  const [html, setHtml] = useState('');
  const [viewMode, setViewMode] = useState<'feed' | 'detail'>('feed');
  
  useEffect(() => {
    // Subscribe to editor changes
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const htmlString = $generateHtmlFromNodes(editor);
        setHtml(htmlString);
      });
    });
  }, [editor]);
  
  return (
    <div className="content-preview bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Preview</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      
      <Tabs>
        <Tab label="Feed View" active={viewMode === 'feed'} onClick={() => setViewMode('feed')}>
          <div className="preview-container feed-view p-4 border rounded-lg">
            <div className="max-w-md mx-auto">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </Tab>
        <Tab label="Detail View" active={viewMode === 'detail'} onClick={() => setViewMode('detail')}>
          <div className="preview-container detail-view p-4 border rounded-lg">
            <div className="max-w-2xl mx-auto">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};
```

### Phase 5: Comment System

Implement the comment system with rich text and media support:

```tsx
// src/components/comments/CommentForm.tsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { eventManager } from '@/services/eventManagement';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaUploader } from '@/components/editor/MediaUploader';
import { Button, Avatar } from '@/components/ui';
import { RootState } from '@/redux/store';

interface CommentFormProps {
  postId: string;
  parentCommentId?: string;
  onCommentCreated?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentCommentId,
  onCommentCreated
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create comment event
      const event = await eventManager.createEvent(
        1, // kind 1 = text note
        content,
        [
          ['e', postId], // Reference to the post
          ...(parentCommentId ? [['e', parentCommentId, 'reply']] : []) // Reference to parent comment if replying
        ]
      );
      
      // Sign and publish
      const result = await eventManager.signAndPublishEvent(event);
      
      if (result.success) {
        // Reset form and notify parent
        setContent('');
        onCommentCreated?.();
      } else {
        setError('Failed to publish comment. Please try again.');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      setError('An error occurred while creating your comment.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Sign in to comment on this post
        </p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex">
        <Avatar
          src={currentUser.picture}
          alt={currentUser.name || 'User'}
          size="sm"
          className="mr-3 mt-1"
        />
        <div className="flex-1">
          <RichTextEditor
            onChange={(text) => setContent(text)}
            placeholder={parentCommentId ? "Write a reply..." : "Write a comment..."}
          />
          
          <MediaUploader
            topicId=""
            postId={postId}
          />
          
          {error && (
            <div className="text-red-500 text-sm mt-2 mb-2">
              {error}
            </div>
          )}
          
          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!content.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              {parentCommentId ? 'Reply' : 'Comment'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
```

```tsx
// src/components/voting/VoteButton.tsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { eventManager } from '@/services/eventManagement';
import { RootState } from '@/redux/store';
import { Button, Icon } from '@/components/ui';

interface VoteButtonProps {
  contentId: string;
  contentType: 'post' | 'comment';
  initialVotes: number;
  initialVote?: 'up' | 'down' | null;
  onVoteChange?: (newVote: 'up' | 'down' | null, voteCount: number) => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  contentId,
  contentType,
  initialVotes = 0,
  initialVote = null,
  onVoteChange
}) => {
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(initialVote);
  const [voteCount, setVoteCount] = useState<number>(initialVotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const handleVote = async (vote: 'up' | 'down') => {
    if (!currentUser) return;
    
    // If already voted the same way, remove the vote
    const newVote = currentVote === vote ? null : vote;
    
    setIsSubmitting(true);
    
    try {
      // Create vote event
      const event = await eventManager.createEvent(
        7, // kind 7 = reaction
        newVote === 'up' ? '+' : newVote === 'down' ? '-' : '',
        [['e', contentId]] // Reference to the content being voted on
      );
      
      // Sign and publish
      const result = await eventManager.signAndPublishEvent(event);
      
      if (result.success) {
        // Calculate new vote count
        let newCount = voteCount;
        
        if (currentVote === 'up' && newVote === null) {
          newCount -= 1;
        } else if (currentVote === 'down' && newVote === null) {
          newCount += 1;
        } else if (currentVote === null && newVote === 'up') {
          newCount += 1;
        } else if (currentVote === null && newVote === 'down') {
          newCount -= 1;
        } else if (currentVote === 'up' && newVote === 'down') {
          newCount -= 2;
        } else if (currentVote === 'down' && newVote === 'up') {
          newCount += 2;
        }
        
        setVoteCount(newCount);
        setCurrentVote(newVote);
        onVoteChange?.(newVote, newCount);
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="vote-buttons flex flex-col items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isSubmitting || !currentUser}
        className={`p-1 ${currentVote === 'up' ? 'text-green-500' : ''}`}
        title="Upvote"
      >
        <Icon name="arrow-up" />
      </Button>
      
      <span className={`text-sm font-medium ${
        currentVote === 'up' ? 'text-green-500' :
        currentVote === 'down' ? 'text-red-500' : ''
      }`}>
        {voteCount}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isSubmitting || !currentUser}
        className={`p-1 ${currentVote === 'down' ? 'text-red-500' : ''}`}
        title="Downvote"
      >
        <Icon name="arrow-down" />
      </Button>
    </div>
  );
};
```

```tsx
// src/components/comments/CommentList.tsx
import React, { useState, useEffect } from 'react';
import { Comment } from '@/types';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { Button, Spinner } from '@/components/ui';
import { commentService } from '@/services/commentService';

interface CommentListProps {
  postId: string;
}

export const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  
  const loadComments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedComments = await commentService.getComments(postId, { sortBy });
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadComments();
  }, [postId, sortBy]);
  
  const handleCommentCreated = () => {
    loadComments();
  };
  
  return (
    <div className="comments-section mt-6">
      <h3 className="text-xl font-semibold mb-4">Comments</h3>
      
      <CommentForm
        postId={postId}
        onCommentCreated={handleCommentCreated}
      />
      
      <div className="comment-sort flex justify-end mb-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="popular">Popular</option>
        </select>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">
          {error}
          <Button
            variant="link"
            onClick={loadComments}
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="comment-list space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onCommentCreated={handleCommentCreated}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### Phase 6: Post Detail Page Layout

Implement the post detail page layout with Reddit-like UI:

```tsx
// src/components/post/PostDetailLayout.tsx
import React from 'react';
import { Post, Topic } from '@/types';
import { VoteButton } from '@/components/voting/VoteButton';
import { CommentList } from '@/components/comments/CommentList';
import { QuickCommentInput } from '@/components/comments/QuickCommentInput';
import { TopicSidebar } from '@/components/topic/TopicSidebar';
import { Icon, Button } from '@/components/ui';

interface PostDetailLayoutProps {
  post: Post;
  topic: Topic;
}

export const PostDetailLayout: React.FC<PostDetailLayoutProps> = ({ post, topic }) => {
  return (
    <div className="post-detail-container max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content area */}
        <div className="flex-1">
          {/* Post content with voting */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="flex">
              {/* Vote buttons */}
              <div className="p-4 border-r border-gray-200 dark:border-gray-700">
                <VoteButton
                  contentId={post.id}
                  contentType="post"
                  initialVotes={post.voteCount}
                  initialVote={post.userVote}
                />
              </div>
              
              {/* Post content */}
              <div className="flex-1 p-6">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <a href={`/t/${topic.slug}`} className="font-medium text-green-600 dark:text-green-400 hover:underline">
                    t/{topic.name}
                  </a>
                  <span className="mx-1">•</span>
                  <span>Posted by {post.author.name}</span>
                  <span className="mx-1">•</span>
                  <span>{post.createdAt}</span>
                </div>
                
                <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
                
                <div className="post-content mb-4">
                  {/* Render post content based on type */}
                  {post.contentType === 'text' && (
                    <div dangerouslySetInnerHTML={{ __html: post.content }} />
                  )}
                  
                  {post.contentType === 'image' && (
                    <img
                      src={post.mediaUrl}
                      alt={post.title}
                      className="max-w-full rounded-lg"
                    />
                  )}
                  
                  {post.contentType === 'video' && (
                    <video
                      src={post.mediaUrl}
                      controls
                      className="max-w-full rounded-lg"
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Post action bar */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center space-x-4">
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <Icon name="message-circle" className="mr-1" />
                <span>{post.commentCount} Comments</span>
              </div>
              
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400">
                <Icon name="zap" className="mr-1" />
                <span>Zap</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400">
                <Icon name="share" className="mr-1" />
                <span>Share</span>
              </Button>
            </div>
          </div>
          
          {/* Quick comment input */}
          <div className="mt-4">
            <QuickCommentInput postId={post.id} />
          </div>
          
          {/* Comment section with sorting */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Comments</h3>
              
              <select
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                defaultValue="most-liked"
              >
                <option value="most-liked">Most Liked</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="most-disliked">Most Disliked</option>
              </select>
            </div>
            
            <CommentList postId={post.id} />
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:w-80 space-y-4">
          <TopicSidebar topic={topic} />
        </div>
      </div>
    </div>
  );
};
```

```tsx
// src/components/comments/QuickCommentInput.tsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { eventManager } from '@/services/eventManagement';
import { RootState } from '@/redux/store';
import { Button, Avatar, TextArea } from '@/components/ui';

interface QuickCommentInputProps {
  postId: string;
}

export const QuickCommentInput: React.FC<QuickCommentInputProps> = ({ postId }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create comment event
      const event = await eventManager.createEvent(
        1, // kind 1 = text note
        content,
        [['e', postId]] // Reference to the post
      );
      
      // Sign and publish
      const result = await eventManager.signAndPublishEvent(event);
      
      if (result.success) {
        // Reset form
        setContent('');
        // Refresh comments (could be handled by parent component)
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Sign in to comment on this post
        </p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex">
        <Avatar
          src={currentUser.picture}
          alt={currentUser.name || 'User'}
          size="sm"
          className="mr-3 mt-1"
        />
        <div className="flex-1">
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="w-full mb-3 min-h-[100px]"
          />
          
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!content.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
```

```tsx
// src/components/topic/TopicSidebar.tsx
import React from 'react';
import { Topic } from '@/types';
import { Button } from '@/components/ui';

interface TopicSidebarProps {
  topic: Topic;
}

export const TopicSidebar: React.FC<TopicSidebarProps> = ({ topic }) => {
  return (
    <>
      {/* Topic information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">About t/{topic.name}</h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {topic.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div>
            <div className="font-medium">{topic.memberCount}</div>
            <div>Members</div>
          </div>
          
          <div>
            <div className="font-medium">{topic.onlineCount}</div>
            <div>Online</div>
          </div>
          
          <div>
            <div className="font-medium">{topic.createdAt}</div>
            <div>Created</div>
          </div>
        </div>
        
        <Button variant="primary" className="w-full">
          Join
        </Button>
      </div>
      
      {/* Moderators */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Moderators</h3>
        
        <ul className="space-y-2">
          {topic.moderators.map(mod => (
            <li key={mod.id} className="flex items-center">
              <img
                src={mod.picture}
                alt={mod.name}
                className="w-6 h-6 rounded-full mr-2"
              />
              <span>{mod.name}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Topic rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">t/{topic.name} Rules</h3>
        
        <ol className="list-decimal list-inside space-y-2">
          {topic.rules.map((rule, index) => (
            <li key={index} className="text-sm">
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
    </>
  );
};
```

## Integration Plan

1. **Week 1**: Implement Topic Page Post Creation
   - Create basic post creation component for topic pages
   - Integrate with existing event system
   - Test and ensure consistency with other pages

2. **Week 2**: ~~Implement Rich Text Editor~~ [DEFERRED] - Continue with Basic Text Editor Improvements
   - Improve the existing basic text editor
   - Ensure consistent styling with the modal
   - Implement basic formatting buttons (without external libraries)

3. **Week 3**: Implement Media Integration
   - Add image, video, and GIF upload support
   - Implement media compression
   - Implement link unfurling for rich previews

4. **Week 4**: Implement Preview System
   - Create preview component
   - Implement different view modes
   - Add validation and feedback

5. **Week 5**: Implement Comment System & Voting
   - Create comment creation component
   - Implement nested comment threading
   - Add media support in comments
   - Implement upvote/downvote functionality
   - Add vote counting and sorting

6. **Week 6**: Implement Post Detail Page Layout
   - Create post detail layout with main content and sidebar
   - Implement post action bar with voting, comment count, zap, and share buttons
   - Add quick comment input below post
   - Implement comment sorting with "Most liked" as default
   - Create sidebar with topic information, moderators, and rules

## Testing Strategy

1. **Unit Tests**:
   - Test individual components (editor, media uploader, preview, comments, voting)
   - Test content processing functions
   - Test validation logic
   - Test file size validation and compression
   - Test comment threading logic
   - Test vote calculation logic
   - Test vote state management

2. **Integration Tests**:
   - Test end-to-end post creation flow
   - Test media upload and embedding for all supported formats
   - Test preview generation
   - Test comment creation and threading
   - Test media uploads in comments
   - Test upvote/downvote functionality for posts
   - Test upvote/downvote functionality for comments
   - Test sorting by vote count

3. **Performance Tests**:
   - Test media compression efficiency
   - Test loading times with various media sizes
   - Test comment system with large thread counts

4. **User Testing**:
   - Conduct usability testing with real users
   - Gather feedback on editor and comment experience
   - Test on various devices and screen sizes
   - Identify and address pain points

## Success Criteria

1. Users can create posts from topic pages
2. Basic text editor provides essential formatting capabilities (bold, italic, links)
3. Media upload and embedding works reliably for images, videos, and GIFs
4. Preview system accurately shows how content will appear
5. Comment system supports basic text formatting and media
6. Upvote/downvote functionality works for both posts and comments
7. Post detail page follows Reddit-like layout with action bar and sidebar
8. Comment sorting defaults to "Most liked" with options for other sorting methods
9. Content creation experience is consistent across all pages
10. File size limits are enforced (10MB for images/GIFs, 150MB for videos)
11. Media compression is implemented for optimized delivery
12. Performance meets or exceeds benchmarks

## Conclusion

This implementation plan provides a comprehensive approach to completing the content management system for Xeadline. By following this plan, we'll deliver a robust, user-friendly content creation experience that supports rich media (images, videos, and GIFs), advanced formatting, intelligent previews, a fully-featured comment system, and upvote/downvote functionality for both posts and comments, all presented in a Reddit-like layout that users will find familiar and intuitive.

The implementation is structured to ensure we can deliver incremental value while building towards the complete solution. Each phase builds on the previous one, allowing us to test and validate our approach as we go. The addition of media size limits and compression will ensure optimal performance, while the comment system with voting functionality will enhance user engagement and interaction, allowing the community to surface the most valuable content. The post detail page layout with its action bar, quick comment input, and informative sidebar will provide a complete and engaging user experience that matches modern social platform expectations.

By leveraging the centralized Event Management System and Storage Service abstraction, we ensure that our content management implementation follows the architectural principles established in the project, with clear separation of concerns, consistent error handling, and reliable operation.