# Video Upload Client Implementation Guide

## Overview

This document provides detailed guidance for implementing the client-side components of the video upload system in Xeadline. It focuses on creating a seamless, intuitive, and reliable user experience while handling the complexities of video uploads.

## User Interface Components

### 1. Upload Button and Dropzone

#### Design Considerations

- **Visibility**: The upload button should be prominently displayed in the post creation interface
- **Accessibility**: Support keyboard navigation and screen readers
- **Drag-and-drop**: Implement a dropzone for intuitive file selection
- **Multi-file support**: Allow selecting multiple videos if needed

#### Implementation Example

```tsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface VideoUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  acceptedFormats?: string[];
}

export const VideoUploadZone: React.FC<VideoUploadProps> = ({
  onFilesSelected,
  maxFileSize = 150 * 1024 * 1024, // 150MB default
  maxFiles = 1,
  acceptedFormats = ['video/mp4', 'video/quicktime', 'video/webm']
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Clear previous errors
    setError(null);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => {
        if (file.errors[0].code === 'file-too-large') {
          return `${file.file.name} is too large (max ${Math.round(maxFileSize / (1024 * 1024))}MB)`;
        }
        if (file.errors[0].code === 'file-invalid-type') {
          return `${file.file.name} is not a supported video format`;
        }
        return `${file.file.name} could not be uploaded: ${file.errors[0].message}`;
      });
      
      setError(errors.join('. '));
      return;
    }
    
    // Handle accepted files
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles.slice(0, maxFiles));
    }
  }, [maxFileSize, maxFiles, onFilesSelected]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': acceptedFormats
    },
    maxSize: maxFileSize,
    maxFiles,
    multiple: maxFiles > 1
  });
  
  return (
    <div className="video-upload-container">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        aria-label="Upload video"
      >
        <input {...getInputProps()} />
        
        <div className="dropzone-content">
          <div className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="currentColor" />
            </svg>
          </div>
          
          {isDragActive ? (
            <p>Drop your video here...</p>
          ) : (
            <>
              <p>Drag & drop a video, or <span className="browse-text">browse</span></p>
              <p className="file-info">
                Supported formats: MP4, MOV, WebM<br />
                Max size: {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="upload-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
```

#### CSS Styling

```css
.video-upload-container {
  width: 100%;
  margin-bottom: 1rem;
}

.dropzone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dropzone:hover, .dropzone.active {
  border-color: #007bff;
  background-color: rgba(0, 123, 255, 0.05);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  color: #007bff;
  margin-bottom: 0.5rem;
}

.browse-text {
  color: #007bff;
  text-decoration: underline;
}

.file-info {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
}

.upload-error {
  margin-top: 0.5rem;
  color: #d9534f;
  font-size: 0.9rem;
}
```

### 2. Progress Indicator

#### Design Considerations

- **Multi-stage progress**: Show different stages (preparation, upload, processing)
- **Detailed feedback**: Display percentage, estimated time remaining, and current stage
- **Visual clarity**: Use colors and animations to indicate progress
- **Cancellation**: Allow users to cancel ongoing uploads

#### Implementation Example

```tsx
import React from 'react';

interface UploadProgressProps {
  stage: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  fileName: string;
  fileSize: number;
  estimatedTimeRemaining?: number; // in seconds
  error?: string;
  onCancel: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  stage,
  progress,
  fileName,
  fileSize,
  estimatedTimeRemaining,
  error,
  onCancel
}) => {
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Format time remaining
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds) return '';
    
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds remaining`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining`;
  };
  
  // Get stage message
  const getStageMessage = (): string => {
    switch (stage) {
      case 'preparing':
        return 'Preparing video...';
      case 'uploading':
        return `Uploading video... ${progress}%`;
      case 'processing':
        return 'Processing video...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return error || 'Upload failed';
      default:
        return '';
    }
  };
  
  // Get progress bar color
  const getProgressColor = (): string => {
    if (stage === 'error') return '#d9534f';
    if (stage === 'complete') return '#5cb85c';
    return '#007bff';
  };
  
  return (
    <div className="upload-progress-container">
      <div className="file-info">
        <div className="file-name" title={fileName}>
          {fileName}
        </div>
        <div className="file-size">
          {formatFileSize(fileSize)}
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ 
            width: `${progress}%`,
            backgroundColor: getProgressColor()
          }}
        />
      </div>
      
      <div className="progress-details">
        <div className="stage-message">
          {getStageMessage()}
        </div>
        
        {stage === 'uploading' && estimatedTimeRemaining && (
          <div className="time-remaining">
            {formatTimeRemaining(estimatedTimeRemaining)}
          </div>
        )}
        
        {(stage === 'uploading' || stage === 'preparing') && (
          <button 
            className="cancel-button"
            onClick={onCancel}
            aria-label="Cancel upload"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
```

#### CSS Styling

```css
.upload-progress-container {
  width: 100%;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.file-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.file-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.file-size {
  color: #6c757d;
  font-size: 0.9rem;
}

.progress-bar-container {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.stage-message {
  color: #495057;
}

.time-remaining {
  color: #6c757d;
}

.cancel-button {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
}

.cancel-button:hover {
  text-decoration: underline;
}
```

### 3. Video Preview

#### Design Considerations

- **Immediate feedback**: Show preview as soon as upload completes
- **Playback controls**: Provide standard video controls
- **Fallback**: Handle cases where preview generation fails
- **Thumbnail**: Generate and display a thumbnail for the video

#### Implementation Example

```tsx
import React, { useState, useEffect, useRef } from 'react';

interface VideoPreviewProps {
  src: string;
  poster?: string;
  title?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  src,
  poster,
  title,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (!src) return;
    
    setIsLoading(true);
    setError(null);
    
    // Reset video element
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);
  
  const handleCanPlay = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };
  
  const handleError = () => {
    const videoElement = videoRef.current;
    let errorMessage = 'Error loading video';
    
    if (videoElement && videoElement.error) {
      switch (videoElement.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source not supported';
          break;
      }
    }
    
    const error = new Error(errorMessage);
    setError(error);
    setIsLoading(false);
    
    if (onError) onError(error);
  };
  
  const handlePlay = () => {
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleRetry = () => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  };
  
  return (
    <div className="video-preview-container">
      {isLoading && (
        <div className="video-loading">
          <div className="spinner"></div>
          <span>Loading video...</span>
        </div>
      )}
      
      {error && (
        <div className="video-error">
          <div className="error-icon">⚠️</div>
          <p>{error.message}</p>
          <button 
            className="retry-button"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
      
      <div 
        className="video-wrapper"
        style={{ display: isLoading || error ? 'none' : 'block' }}
      >
        <video
          ref={videoRef}
          className="video-element"
          controls
          preload="metadata"
          poster={poster}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          playsInline
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {title && (
          <div className="video-title">
            {title}
          </div>
        )}
      </div>
    </div>
  );
};
```

#### CSS Styling

```css
.video-preview-container {
  width: 100%;
  position: relative;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.video-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.video-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #0069d9;
}

.video-wrapper {
  width: 100%;
  height: 100%;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-title {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.9rem;
}
```

## Upload Logic Implementation

### 1. Pre-upload Validation

#### Validation Checks

- **File type**: Ensure the file is a supported video format
- **File size**: Check against maximum allowed size
- **Duration**: Verify the video is within allowed duration limits
- **Dimensions**: Check if resolution is within acceptable range
- **Playability**: Verify the video can be played before uploading

#### Implementation Example

```typescript
interface VideoValidationResult {
  isValid: boolean;
  issues: string[];
  metadata?: {
    duration: number;
    width: number;
    height: number;
    format: string;
  };
}

export async function validateVideo(file: File): Promise<VideoValidationResult> {
  const issues: string[] = [];
  
  // Check file type
  const supportedFormats = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!supportedFormats.includes(file.type)) {
    issues.push(`Unsupported file format: ${file.type}. Please use MP4, MOV, or WebM.`);
  }
  
  // Check file size
  const maxSize = 150 * 1024 * 1024; // 150MB
  if (file.size > maxSize) {
    issues.push(`File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds the maximum allowed size (150MB).`);
  }
  
  // Extract and check video metadata
  try {
    const metadata = await extractVideoMetadata(file);
    
    // Check duration
    const maxDuration = 5 * 60; // 5 minutes
    if (metadata.duration > maxDuration) {
      issues.push(`Video duration (${Math.round(metadata.duration / 60)} minutes) exceeds the maximum allowed duration (5 minutes).`);
    }
    
    // Check dimensions
    const maxDimension = 1920; // 1080p
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      issues.push(`Video resolution (${metadata.width}x${metadata.height}) exceeds the maximum allowed resolution (1920x1920).`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      metadata
    };
  } catch (error) {
    issues.push(`Could not validate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      issues
    };
  }
}

async function extractVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Set timeout for loading metadata
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Timeout loading video metadata'));
    }, 10000);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(video.src);
      
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        format: file.type
      });
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(video.src);
      reject(new Error('Error loading video: ' + (video.error ? video.error.message : 'Unknown error')));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
```

### 2. Chunked Upload Implementation

#### Design Considerations

- **Adaptive chunk size**: Adjust based on network conditions
- **Parallel uploads**: Upload multiple chunks simultaneously
- **Progress tracking**: Track individual chunk progress
- **Retry logic**: Automatically retry failed chunks
- **Cancellation**: Allow cancelling the upload at any point

#### Implementation Example

```typescript
interface ChunkedUploadOptions {
  file: File;
  onProgress?: (progress: number) => void;
  onChunkProgress?: (chunkIndex: number, progress: number) => void;
  onComplete?: (url: string) => void;
  onError?: (error: Error) => void;
  baseUrl?: string;
  maxConcurrentChunks?: number;
  chunkSize?: number;
  maxRetries?: number;
}

export class ChunkedUploader {
  private file: File;
  private chunkSize: number;
  private maxConcurrentChunks: number;
  private maxRetries: number;
  private baseUrl: string;
  private uploadId: string | null = null;
  private totalChunks: number = 0;
  private uploadedChunks: Set<number> = new Set();
  private activeChunks: Set<number> = new Set();
  private chunkProgress: Map<number, number> = new Map();
  private abortControllers: Map<number, AbortController> = new Map();
  private isCancelled: boolean = false;
  private networkSpeed: number | null = null;
  
  // Callbacks
  private onProgress?: (progress: number) => void;
  private onChunkProgress?: (chunkIndex: number, progress: number) => void;
  private onComplete?: (url: string) => void;
  private onError?: (error: Error) => void;
  
  constructor(options: ChunkedUploadOptions) {
    this.file = options.file;
    this.onProgress = options.onProgress;
    this.onChunkProgress = options.onChunkProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
    this.baseUrl = options.baseUrl || '/api/storage';
    this.maxConcurrentChunks = options.maxConcurrentChunks || 3;
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB default
    this.maxRetries = options.maxRetries || 3;
    
    this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
  }
  
  async start(): Promise<void> {
    try {
      // Measure network speed to determine optimal chunk size and concurrency
      await this.measureNetworkSpeed();
      this.adjustChunkSizeAndConcurrency();
      
      // Initialize upload
      await this.initializeUpload();
      
      // Start uploading chunks
      await this.uploadChunks();
    } catch (error) {
      if (this.isCancelled) return;
      
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  cancel(): void {
    this.isCancelled = true;
    
    // Abort all active requests
    this.abortControllers.forEach(controller => {
      controller.abort();
    });
    
    // Clear all abort controllers
    this.abortControllers.clear();
    
    // Clear active chunks
    this.activeChunks.clear();
  }
  
  private async measureNetworkSpeed(): Promise<void> {
    try {
      const testSize = 100 * 1024; // 100KB
      const testUrl = `${this.baseUrl}/network-test?size=${testSize}`;
      
      const startTime = Date.now();
      const response = await fetch(testUrl);
      await response.arrayBuffer();
      const endTime = Date.now();
      
      const durationSeconds = (endTime - startTime) / 1000;
      const speedMbps = (testSize / 1024 / 1024 * 8) / durationSeconds;
      
      this.networkSpeed = speedMbps;
      console.log(`Measured network speed: ${speedMbps.toFixed(2)} Mbps`);
    } catch (error) {
      console.warn('Error measuring network speed:', error);
      this.networkSpeed = null;
    }
  }
  
  private adjustChunkSizeAndConcurrency(): void {
    if (!this.networkSpeed) return;
    
    // Adjust chunk size based on network speed
    if (this.networkSpeed > 20) { // >20 Mbps
      this.chunkSize = 10 * 1024 * 1024; // 10MB
      this.maxConcurrentChunks = 4;
    } else if (this.networkSpeed > 10) { // 10-20 Mbps
      this.chunkSize = 5 * 1024 * 1024; // 5MB
      this.maxConcurrentChunks = 3;
    } else if (this.networkSpeed > 5) { // 5-10 Mbps
      this.chunkSize = 2 * 1024 * 1024; // 2MB
      this.maxConcurrentChunks = 2;
    } else { // <5 Mbps
      this.chunkSize = 1 * 1024 * 1024; // 1MB
      this.maxConcurrentChunks = 1;
    }
    
    // Recalculate total chunks
    this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
    
    console.log(`Adjusted chunk size: ${this.chunkSize / (1024 * 1024)}MB, concurrent chunks: ${this.maxConcurrentChunks}`);
  }
  
  private async initializeUpload(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/init-chunked-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: this.file.name,
        fileSize: this.file.size,
        contentType: this.file.type,
        totalChunks: this.totalChunks
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to initialize upload: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    this.uploadId = data.uploadId;
    
    console.log(`Upload initialized with ID: ${this.uploadId}, total chunks: ${this.totalChunks}`);
  }
  
  private async uploadChunks(): Promise<void> {
    if (!this.uploadId) {
      throw new Error('Upload not initialized');
    }
    
    // Create array of chunk indices
    const chunks = Array.from({ length: this.totalChunks }, (_, i) => i);
    
    // Process chunks with limited concurrency
    while (chunks.length > 0 || this.activeChunks.size > 0) {
      if (this.isCancelled) return;
      
      // Fill up to max concurrent chunks
      while (chunks.length > 0 && this.activeChunks.size < this.maxConcurrentChunks) {
        const chunkIndex = chunks.shift()!;
        this.activeChunks.add(chunkIndex);
        
        // Start uploading chunk (don't await here to allow concurrency)
        this.uploadChunk(chunkIndex).then(() => {
          this.activeChunks.delete(chunkIndex);
          this.uploadedChunks.add(chunkIndex);
          this.updateProgress();
        }).catch(error => {
          console.error(`Error uploading chunk ${chunkIndex}:`, error);
          this.activeChunks.delete(chunkIndex);
          
          // Re-add chunk to the queue if retries are available
          if ((error as any).retries < this.maxRetries) {
            chunks.push(chunkIndex);
          } else if (this.onError) {
            this.onError(new Error(`Failed to upload chunk ${chunkIndex} after ${this.maxRetries} retries`));
          }
        });
      }
      
      // Wait a bit before checking again
      if (this.activeChunks.size >= this.maxConcurrentChunks || chunks.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // All chunks uploaded, complete the upload
    await this.completeUpload();
  }
  
  private async uploadChunk(chunkIndex: number, retries = 0): Promise<void> {
    if (this.isCancelled) return;
    
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const chunk = this.file.slice(start, end);
    
    // Create form data
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', this.uploadId!);
    formData.append('chunkIndex', chunkIndex.toString());
    
    // Create abort controller for this chunk
    const abortController = new AbortController();
    this.abortControllers.set(chunkIndex, abortController);
    
    try {
      // Upload chunk with progress tracking
      const xhr = new XMLHttpRequest();
      
      // Create promise for XHR completion
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.open('POST', `${this.baseUrl}/upload-chunk`);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            this.chunkProgress.set(chunkIndex, progress);
            
            if (this.onChunkProgress) {
              this.onChunkProgress(chunkIndex, progress);
            }
            
            this.updateProgress();
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const error = new Error(`HTTP error ${xhr.status}`);
            (error as any).retries = retries;
            reject(error);
          }
        };
        
        xhr.onerror = () => {
          const error = new Error('Network error');
          (error as any).retries = retries;
          reject(error);
        };
        
        xhr.onabort = () => {
          const error = new Error('Upload aborted');
          (error as any).retries = retries;
          reject(error);
        };
        
        xhr.send(formData);
      });
      
      // Handle abort controller
      const abortPromise = new Promise<void>((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      });
      
      // Wait for either completion or abortion
      await Promise.race([uploadPromise, abortPromise]);
      
      // Clean up
      this.abortControllers.delete(chunkIndex);
      
    } catch (error) {
      // Clean up
      this.abortControllers.delete(chunkIndex);
      
      // Handle retries
      if (retries < this.maxRetries && !this.isCancelled) {
        console.log(`Retrying chunk ${chunkIndex}, attempt ${retries + 1}/${this.maxRetries}`);
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.uploadChunk(chunkIndex, retries + 1);
      }
      
      throw error;
    }
  }
  
  private async completeUpload(): Promise<void> {
    if (!this.uploadId || this.isCancelled) return;
    
    try {
      const response = await fetch(`${this.baseUrl}/complete-chunked-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uploadId: this.uploadId,
          fileName: this.file.name,
          contentType: this.file.type,
          totalChunks: this.totalChunks
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to complete upload: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (this.onProgress) {
        this.onProgress(100);
      }
      
      if (this.onComplete) {
        this.onComplete(data.url);
      }
      
      console.log(`Upload completed: ${data.url}`);
    } catch (error) {
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  private updateProgress(): void {
    if (!this.onProgress) return;
    
    // Calculate overall progress
    let totalProgress = 0;
    
    // Add progress from uploaded chunks (100% each)
    totalProgress += this.uploadedChunks.size * 100;
    
    // Add progress from active chunks
    this.activeChunks.forEach(chunkIndex => {
      totalProgress += this.chunkProgress.get(chunkIndex) || 0;
    });
    
    // Calculate percentage
    const overallProgress = Math.round(totalProgress / this.totalChunks);
    
    // Call progress callback
    this.onProgress(overallProgress);
  }
}
```

### 3. Main Upload Controller

#### Design Considerations

- **State management**: Track upload state and progress
- **Error handling**: Provide clear error messages and recovery options
- **Cancellation**: Allow users to cancel uploads
- **Retry logic**: Implement automatic and manual retry options
- **Upload history**: Track and manage multiple uploads

#### Implementation Example

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { VideoUploadZone } from './VideoUploadZone';
import { UploadProgress } from './UploadProgress';
import { VideoPreview } from './VideoPreview';
import { validateVideo } from '../utils/videoValidator';
import { ChunkedUploader } from '../utils/chunkedUploader';

interface VideoUploadControllerProps {
  onUploadComplete: (videoUrl: string, metadata: any) => void;
  maxFileSize?: number;
  maxDuration?: number;
}

type UploadState = 'idle' | 'validating' | 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';

export const VideoUploadController: React.FC<VideoUploadControllerProps> = ({
  onUploadComplete,
  maxFileSize = 150 * 1024 * 1024, // 150MB
  maxDuration = 300 // 5 minutes
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [uploader, setUploader] = useState<ChunkedUploader | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (uploader) {
        uploader.cancel();
      }
    };
  }, [uploader]);
  
  // Calculate estimated time remaining
  useEffect(() => {
    if (uploadState !== 'uploading' || !uploadStartTime || progress === 0) {
      setEstimatedTimeRemaining(null);
      return;
    }
    
    const elapsed = Date.now() - uploadStartTime;
    const estimatedTotal = elapsed / (progress / 100);
    const remaining = estimatedTotal - elapsed;
    
    setEstimatedTimeRemaining(Math.round(remaining / 1000)); // Convert to seconds
  }, [progress, uploadStartTime, uploadState]);
  
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setUploadState('validating');
    setProgress(0);
    setVideoUrl(null);
    setError(null);
    
    try {
      // Validate video
      const validationResult = await validateVideo(selectedFile);
      
      if (!validationResult.isValid) {
        setError(validationResult.issues.join(' '));
        setUploadState('error');
        return;
      }
      
      // Store metadata
      setMetadata(validationResult.metadata);
      
      // Prepare for upload
      setUploadState('preparing');
      
      // Create uploader
      const newUploader = new ChunkedUploader({
        file: selectedFile,
        onProgress: (uploadProgress) => {
          setProgress(uploadProgress);
        },
        onComplete: (url) => {
          setVideoUrl(url);
          setUploadState('processing');
          
          // Simulate processing time (in a real app, this would be server-side)
          setTimeout(() => {
            setUploadState('complete');
            onUploadComplete(url, validationResult.metadata);
          }, 2000);
        },
        onError: (uploadError) => {
          setError(uploadError.message);
          setUploadState('error');
        }
      });
      
      setUploader(newUploader);
      
      // Start upload
      setUploadState('uploading');
      setUploadStartTime(Date.now());
      await newUploader.start();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setUploadState('error');
    }
  }, [maxFileSize, maxDuration, onUploadComplete]);
  
  const handleCancel = useCallback(() => {
    if (uploader) {
      uploader.cancel();
      setUploader(null);
    }
    
    setUploadState('idle');
    setFile(null);
    setProgress(0);
    setVideoUrl(null);
    setError(null);
    setMetadata(null);
    setEstimatedTimeRemaining(null);
    setUploadStartTime(null);
  }, [uploader]);
  
  const handleRetry = useCallback(() => {
    if (!file) return;
    
    // Reset state
    setUploadState('validating');
    setProgress(0);
    setVideoUrl(null);
    setError(null);
    setEstimatedTimeRemaining(null);
    setUploadStartTime(null);
    
    // Re-start the upload process
    handleFilesSelected([file]);
  }, [file, handleFilesSelected]);
  
  return (
    <div className="video-upload-controller">
      {uploadState === 'idle' && (
        <VideoUploadZone
          onFilesSelected={handleFilesSelected}
          maxFileSize={maxFileSize}
          acceptedFormats={['video/mp4', 'video/quicktime', 'video/webm']}
        />
      )}
      
      {(uploadState === 'validating' || uploadState === 'preparing' || 
        uploadState === 'uploading' || uploadState === 'processing') && file && (
        <UploadProgress
          stage={uploadState}
          progress={progress}
          fileName={file.name}
          fileSize={file.size}
          estimatedTimeRemaining={estimatedTimeRemaining}
          onCancel={handleCancel}
        />
      )}
      
      {uploadState === 'error' && error && (
        <div className="upload-error-container">
          <div className="error-message">
            {error}
          </div>
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={handleRetry}
            >
              Retry Upload
            </button>
            <button 
              className="cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {uploadState === 'complete' && videoUrl && (
        <VideoPreview
          src={videoUrl}
          title={file?.name}
          onError={(previewError) => {
            console.error('Preview error:', previewError);
            // Don't change upload state, just log the error
          }}
        />
      )}
    </div>
  );
};
```

## Integration with Post Creation

### 1. Post Editor Integration

#### Design Considerations

- **Seamless workflow**: Integrate video uploads into the post creation flow
- **Multiple media types**: Support both images and videos
- **Editing options**: Allow replacing or removing uploaded videos
- **Preview in context**: Show how the video will appear in the post

#### Implementation Example

```tsx
import React, { useState, useCallback } from 'react';
import { VideoUploadController } from './VideoUploadController';
import { TextEditor } from './TextEditor';

interface PostEditorProps {
  onSubmit: (content: PostContent) => void;
  initialContent?: PostContent;
}

interface PostContent {
  text: string;
  media: Array<{
    type: 'image' | 'video';
    url: string;
    metadata?: any;
  }>;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  onSubmit,
  initialContent = { text: '', media: [] }
}) => {
  const [content, setContent] = useState<PostContent>(initialContent);
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  const handleTextChange = useCallback((text: string) => {
    setContent(prev => ({ ...prev, text }));
  }, []);
  
  const handleMediaUploadComplete = useCallback((url: string, metadata: any) => {
    setContent(prev => ({
      ...prev,
      media: [...prev.media, { type: mediaType, url, metadata }]
    }));
    
    setIsUploading(false);
    setShowMediaUploader(false);
  }, [mediaType]);
  
  const handleRemoveMedia = useCallback((index: number) => {
    setContent(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  }, []);
  
  const handleSubmit = useCallback(() => {
    onSubmit(content);
  }, [content, onSubmit]);
  
  const startMediaUpload = useCallback((type: 'image' | 'video') => {
    setMediaType(type);
    setShowMediaUploader(true);
    setIsUploading(true);
  }, []);
  
  const cancelMediaUpload = useCallback(() => {
    setShowMediaUploader(false);
    setIsUploading(false);
  }, []);
  
  return (
    <div className="post-editor">
      <TextEditor
        value={content.text}
        onChange={handleTextChange}
        placeholder="What's on your mind?"
      />
      
      {content.media.length > 0 && (
        <div className="media-preview-container">
          {content.media.map((media, index) => (
            <div key={index} className="media-preview-item">
              {media.type === 'image' ? (
                <img 
                  src={media.url} 
                  alt="User uploaded content" 
                  className="media-preview-image"
                />
              ) : (
                <video 
                  src={media.url} 
                  controls 
                  className="media-preview-video"
                />
              )}
              
              <button 
                className="remove-media-button"
                onClick={() => handleRemoveMedia(index)}
                aria-label="Remove media"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      
      {showMediaUploader && (
        <div className="media-uploader-container">
          {mediaType === 'video' ? (
            <VideoUploadController
              onUploadComplete={handleMediaUploadComplete}
            />
          ) : (
            <ImageUploadController
              onUploadComplete={handleMediaUploadComplete}
            />
          )}
          
          <button 
            className="cancel-upload-button"
            onClick={cancelMediaUpload}
          >
            Cancel Upload
          </button>
        </div>
      )}
      
      <div className="editor-actions">
        <div className="media-buttons">
          <button 
            className="add-image-button"
            onClick={() => startMediaUpload('image')}
            disabled={isUploading}
          >
            Add Image
          </button>
          
          <button 
            className="add-video-button"
            onClick={() => startMediaUpload('video')}
            disabled={isUploading}
          >
            Add Video
          </button>
        </div>
        
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={isUploading || (!content.text && content.media.length === 0)}
        >
          Post
        </button>
      </div>
    </div>
  );
};
```

### 2. Mobile Considerations

#### Design Considerations

- **Responsive UI**: Ensure all components work well on mobile devices
- **Touch interactions**: Optimize for touch input
- **Network awareness**: Handle variable network conditions
- **Battery optimization**: Minimize battery usage during uploads
- **Storage constraints**: Be mindful of device storage limitations

#### Implementation Example

```css
/* Mobile-specific styles */
@media (max-width: 768px) {
  .video-upload-container {
    padding: 0.5rem;
  }
  
  .dropzone {
    padding: 1rem;
  }
  
  .file-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .progress-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .cancel-button {
    padding: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .video-preview-container {
    aspect-ratio: 9 / 16; /* Vertical video more common on mobile */
  }
  
  .media-preview-container {
    display: flex;
    flex-direction: column;
  }
  
  .editor-actions {
    flex-direction: column;
    gap: 1rem;
  }
  
  .media-buttons {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
  
  .submit-button {
    width: 100%;
  }
}
```

```typescript
// Mobile-specific optimizations
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Adjust chunk size for mobile
if (isMobile) {
  // Smaller chunks for mobile to avoid memory issues
  this.chunkSize = Math.min(this.chunkSize, 2 * 1024 * 1024); // Max 2MB on mobile
  
  // Fewer concurrent uploads on mobile
  this.maxConcurrentChunks = Math.min(this.maxConcurrentChunks, 2);
  
  // Check for battery status if available
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      if (battery.level < 0.2 && !battery.charging) {
        // Low battery and not charging, reduce concurrency further
        this.maxConcurrentChunks = 1;
        console.log('Low battery detected, reducing concurrency to 1');
      }
    });
  }
  
  // Check for data saver mode
  if ('connection' in navigator && (navigator as any).connection.saveData) {
    // Data saver is enabled, ask user before proceeding with large uploads
    if (this.file.size > 10 * 1024 * 1024) { // 10MB
      if (!confirm('You are on Data Saver mode. Uploading this video may use a significant amount of data. Continue?')) {
        throw new Error('Upload cancelled due to Data Saver mode');
      }
    }
  }
}
```

## Accessibility Considerations

### 1. Keyboard Navigation

- Ensure all interactive elements are keyboard accessible
- Use proper focus management during the upload process
- Provide keyboard shortcuts for common actions

### 2. Screen Reader Support

- Use appropriate ARIA attributes for custom components
- Provide descriptive labels for all interactive elements
- Announce progress updates and state changes

### 3. Color Contrast

- Ensure sufficient color contrast for all text and UI elements
- Don't rely solely on color to convey information
- Provide alternative visual indicators for color-blind users

### Implementation Example

```tsx
// Accessible progress indicator
<div 
  className="upload-progress-container"
  role="region"
  aria-label="Video upload progress"
  aria-live="polite"
>
  <div className="file-info">
    <div className="file-name" title={fileName}>
      {fileName}
    </div>
    <div className="file-size">
      {formatFileSize(fileSize)}
    </div>
  </div>
  
  <div 
    className="progress-bar-container"
    role="progressbar"
    aria-valuenow={progress}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`Upload progress: ${progress}%`}
  >
    <div 
      className="progress-bar-fill" 
      style={{ 
        width: `${progress}%`,
        backgroundColor: getProgressColor()
      }}
    />
  </div>
  
  <div className="progress-details">
    <div className="stage-message">
      {getStageMessage()}
    </div>
    
    {stage === 'uploading' && estimatedTimeRemaining && (
      <div className="time-remaining" aria-live="polite">
        {formatTimeRemaining(estimatedTimeRemaining)}
      </div>
    )}
    
    {(stage === 'uploading' || stage === 'preparing') && (
      <button 
        className="cancel-button"
        onClick={onCancel}
        aria-label="Cancel upload"
      >
        Cancel
      </button>
    )}
  </div>
</div>
```

## Performance Optimization

### 1. Memory Management

- Release object URLs when no longer needed
- Avoid keeping large files in memory
- Use streams for processing when possible

### 2. CPU Usage Optimization

- Throttle progress updates to reduce UI updates
- Use web workers for intensive operations
- Implement lazy loading for components

### 3. Network Optimization

- Implement connection-aware uploads
- Use compression when appropriate
- Prioritize critical resources

### Implementation Example

```typescript
// Memory optimization for video preview
useEffect(() => {
  // Create object URL for preview
  if (file) {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // Clean up object URL when component unmounts or file changes
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }
}, [file]);

// CPU usage optimization with throttled progress updates
const throttledSetProgress = useCallback(
  throttle((value: number) => {
    setProgress(value);
  }, 100), // Update UI at most every 100ms
  []
);

// Network optimization with connection-aware uploads
useEffect(() => {
  const connection = navigator.connection as any;
  
  if (connection) {
    const updateNetworkParams = () => {
      // Adjust upload parameters based on connection
      if (connection.effectiveType === '4g') {
        setChunkSize(5 * 1024 * 1024); // 5MB
        setConcurrentChunks(3);
      } else if (connection.effectiveType === '3g') {
        setChunkSize(2 * 1024 * 1024); // 2MB
        setConcurrentChunks(2);
      } else {
        setChunkSize(1 * 1024 * 1024); // 1MB
        setConcurrentChunks(1);
      }
    };
    
    // Initial update
    updateNetworkParams();
    
    // Listen for connection changes
    connection.addEventListener('change', updateNetworkParams);
    
    return () => {
      connection.removeEventListener('change', updateNetworkParams);
    };
  }
}, []);
```

## Conclusion

This client implementation guide provides a comprehensive approach to creating a robust, user-friendly video upload experience in Xeadline. By implementing these components and strategies, you can ensure that video uploads are fast, reliable, and accessible across different devices and network conditions.

Key takeaways:

1. **Progressive Enhancement**: Start with basic functionality and enhance based on device capabilities
2. **User-Centric Design**: Focus on providing clear feedback and intuitive controls
3. **Resilient Implementation**: Handle errors gracefully and provide recovery options
4. **Performance Optimization**: Balance resource usage with user experience
5. **Accessibility**: Ensure the upload experience works for all users

By following these guidelines, you can create a video upload experience that meets the needs of Xeadline users while maintaining high performance and reliability.