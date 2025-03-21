# Video Upload Implementation Plan for Xeadline

## Executive Summary

This document outlines a phased implementation plan to improve video upload functionality in the Xeadline application. Based on our research and testing, we've identified several issues with the current implementation, including performance problems, preview issues, and high resource usage. This plan provides a roadmap for addressing these issues and enhancing the overall video upload experience.

## Current Issues

1. **Performance Issues**: Video uploads are taking longer than expected (2.2+ minutes for a ~30MB file)
2. **Preview Problems**: Video previews are not displaying after upload
3. **File Format Issues**: Files may not be properly recognized as videos in Vercel Blob storage
4. **Resource Intensive**: The upload process is causing high CPU usage and heating up devices

## Implementation Phases

### Phase 1: Immediate Fixes (1-2 weeks)

#### 1.1 Content Type Handling

**Objective**: Ensure proper content type handling for video uploads

**Tasks**:
- [ ] Update the `storageService.store()` method to explicitly set and preserve content types
- [ ] Add content type verification before and after upload
- [ ] Implement proper MIME type detection for video files

**Implementation**:
```typescript
// In src/services/storage/providers/vercelBlobProvider.ts
async store(data: Blob | File | Buffer, options?: StorageOptions): Promise<StorageResult> {
  // Ensure content type is correctly set
  const contentType = options?.contentType || 
    (data instanceof File ? data.type : 'application/octet-stream');
  
  // Verify it's a supported video type if it's a video
  if (contentType.startsWith('video/')) {
    const supportedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!supportedTypes.includes(contentType)) {
      console.warn(`Potentially unsupported video type: ${contentType}`);
    }
  }
  
  // Add content type to metadata for verification
  const metadata = {
    ...options?.metadata,
    originalContentType: contentType
  };
  
  // Upload to Vercel Blob with explicit content type
  const blob = await put(fileName, data, {
    access: 'public',
    contentType: contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  });
  
  // Verify the content type was preserved
  if (blob.contentType !== contentType) {
    console.error(`Content type mismatch: expected ${contentType}, got ${blob.contentType}`);
  }
  
  return {
    id: blob.pathname,
    url: blob.url,
    contentType: blob.contentType,
    size: data instanceof File ? data.size : data instanceof Blob ? data.size : (data as Buffer).length,
    metadata: metadata,
    createdAt: new Date(),
  };
}
```

#### 1.2 Direct Upload Implementation

**Objective**: Implement direct uploads to Vercel Blob for better performance

**Tasks**:
- [ ] Create a new API endpoint for generating direct upload URLs
- [ ] Update the client-side upload logic to use direct uploads
- [ ] Add proper error handling and progress tracking

**Implementation**:
```typescript
// New API endpoint: src/pages/api/storage/get-direct-upload-url.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { put } from '@vercel/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contentType, fileName } = req.query;
    
    if (!contentType || !fileName) {
      return res.status(400).json({ error: 'Missing contentType or fileName' });
    }
    
    // Generate a direct upload URL
    const { url, uploadUrl } = await put(fileName as string, {
      access: 'public',
      contentType: contentType as string,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    return res.status(200).json({ url, uploadUrl });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Client-side implementation in src/lib/directUpload.ts
export async function directUpload(file: File): Promise<string> {
  // Get direct upload URL
  const params = new URLSearchParams({
    contentType: file.type,
    fileName: `video-${Date.now()}.${file.name.split('.').pop()}`
  });
  
  const response = await fetch(`/api/storage/get-direct-upload-url?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get upload URL: ${response.status}`);
  }
  
  const { url, uploadUrl } = await response.json();
  
  // Upload directly to Vercel Blob
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.status}`);
  }
  
  return url;
}
```

#### 1.3 Improved Progress Tracking

**Objective**: Provide accurate progress tracking for video uploads

**Tasks**:
- [ ] Implement detailed progress tracking with multiple stages
- [ ] Update the UI to show more informative progress indicators
- [ ] Add estimated time remaining calculation

**Implementation**:
```typescript
// In src/components/editor/MediaUploader.tsx
const [uploadState, setUploadState] = useState({
  stage: 'idle', // 'idle', 'preparing', 'uploading', 'processing', 'complete', 'error'
  progress: 0,
  message: '',
  error: null,
  estimatedTimeRemaining: null
});

// Track upload progress with stages
const handleProgress = (stage, progress, details = {}) => {
  setUploadState(prev => {
    // Calculate estimated time remaining if we have enough data
    let estimatedTimeRemaining = prev.estimatedTimeRemaining;
    if (stage === 'uploading' && prev.stage === 'uploading' && progress > prev.progress) {
      const elapsed = Date.now() - uploadStartTime;
      const rate = progress / elapsed; // % per ms
      const remaining = (100 - progress) / rate; // ms remaining
      estimatedTimeRemaining = Math.round(remaining / 1000); // seconds
    }
    
    return {
      stage,
      progress,
      message: getStageMessage(stage, progress, details),
      error: null,
      estimatedTimeRemaining
    };
  });
};

// Get appropriate message for each stage
const getStageMessage = (stage, progress, details) => {
  switch (stage) {
    case 'preparing':
      return 'Preparing file for upload...';
    case 'uploading':
      return `Uploading video... ${progress}%`;
    case 'processing':
      return 'Processing video...';
    case 'complete':
      return 'Upload complete!';
    default:
      return '';
  }
};

// Render progress UI
const renderProgress = () => {
  return (
    <div className="upload-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${uploadState.progress}%` }}
        />
      </div>
      <div className="progress-info">
        <span className="progress-stage">{uploadState.message}</span>
        {uploadState.estimatedTimeRemaining && (
          <span className="progress-time">
            {uploadState.estimatedTimeRemaining > 60 
              ? `About ${Math.ceil(uploadState.estimatedTimeRemaining / 60)} minutes remaining` 
              : `About ${uploadState.estimatedTimeRemaining} seconds remaining`}
          </span>
        )}
      </div>
    </div>
  );
};
```

### Phase 2: Enhanced Upload Experience (2-4 weeks)

#### 2.1 Client-Side Video Validation

**Objective**: Validate videos before upload to prevent issues

**Tasks**:
- [ ] Implement client-side video validation
- [ ] Extract and verify video metadata
- [ ] Add file size and format checks

**Implementation**:
```typescript
// In src/lib/videoValidator.ts
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  isValid: boolean;
  issues: string[];
}

export async function validateVideo(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const issues: string[] = [];
    
    // Set timeout for loading metadata
    const timeout = setTimeout(() => {
      issues.push('Timeout loading video metadata');
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        format: file.type,
        isValid: false,
        issues
      });
    }, 10000);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      
      // Check duration
      if (video.duration > 300) { // 5 minutes
        issues.push('Video is too long (maximum 5 minutes)');
      }
      
      // Check dimensions
      if (video.videoWidth > 1920 || video.videoHeight > 1080) {
        issues.push('Video resolution is too high (maximum 1080p)');
      }
      
      // Check if video is playable
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        issues.push('Video dimensions could not be determined');
      }
      
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        format: file.type,
        isValid: issues.length === 0,
        issues
      });
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      issues.push('Error loading video: ' + (video.error ? video.error.message : 'Unknown error'));
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        format: file.type,
        isValid: false,
        issues
      });
    };
    
    video.src = URL.createObjectURL(file);
  });
}
```

#### 2.2 Optimized Chunked Upload Implementation

**Objective**: Improve chunked upload performance and reliability

**Tasks**:
- [ ] Implement adaptive chunk sizing based on network conditions
- [ ] Add parallel chunk uploads with proper concurrency control
- [ ] Implement robust error handling and retries

**Implementation**:
```typescript
// In src/lib/adaptiveChunkedUpload.ts
export async function uploadWithAdaptiveChunks(file: File, onProgress?: (progress: number) => void): Promise<string> {
  // Measure network speed with a small test upload
  const networkSpeed = await measureNetworkSpeed();
  
  // Determine optimal chunk size based on network speed
  // Faster connections can handle larger chunks
  let chunkSize = 1 * 1024 * 1024; // 1MB default
  if (networkSpeed > 10) { // >10 Mbps
    chunkSize = 5 * 1024 * 1024; // 5MB
  } else if (networkSpeed > 5) { // 5-10 Mbps
    chunkSize = 2 * 1024 * 1024; // 2MB
  }
  
  // Determine optimal concurrency based on network speed
  let concurrency = 2; // Default
  if (networkSpeed > 20) { // >20 Mbps
    concurrency = 4;
  } else if (networkSpeed > 10) { // 10-20 Mbps
    concurrency = 3;
  }
  
  console.log(`Network speed: ${networkSpeed} Mbps, chunk size: ${chunkSize/1024/1024}MB, concurrency: ${concurrency}`);
  
  // Initialize upload
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadId = await initializeUpload(file.name, file.type, totalChunks);
  
  // Upload chunks with controlled concurrency
  const chunks = Array.from({ length: totalChunks }, (_, i) => i);
  let completed = 0;
  
  // Process chunks in batches based on concurrency
  for (let i = 0; i < totalChunks; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    await Promise.all(batch.map(async (chunkIndex) => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Try uploading with retries
      let retries = 0;
      while (retries < 3) {
        try {
          await uploadChunk(uploadId, chunkIndex, chunk);
          break;
        } catch (error) {
          retries++;
          if (retries >= 3) throw error;
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries - 1)));
        }
      }
      
      // Update progress
      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / totalChunks) * 90));
      }
    }));
  }
  
  // Complete the upload
  if (onProgress) onProgress(95);
  const result = await completeUpload(uploadId);
  if (onProgress) onProgress(100);
  
  return result.url;
}

// Helper to measure network speed
async function measureNetworkSpeed(): Promise<number> {
  const startTime = Date.now();
  const testUrl = '/api/network-test?size=100kb';
  
  try {
    const response = await fetch(testUrl);
    const data = await response.arrayBuffer();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    const size = data.byteLength / (1024 * 1024); // MB
    const speedMbps = (size * 8) / duration; // Mbps
    
    return speedMbps;
  } catch (error) {
    console.error('Error measuring network speed:', error);
    return 5; // Default to 5 Mbps
  }
}
```

#### 2.3 Video Preview Optimization

**Objective**: Ensure video previews load correctly after upload

**Tasks**:
- [ ] Implement proper video preview component
- [ ] Add thumbnail generation for videos
- [ ] Improve video metadata handling

**Implementation**:
```typescript
// In src/components/editor/VideoPreview.tsx
import React, { useState, useEffect, useRef } from 'react';

interface VideoPreviewProps {
  src: string;
  poster?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  src, 
  poster,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (!src) return;
    
    setIsLoading(true);
    setError(null);
    
    // Preload the video metadata
    const preloadVideo = async () => {
      try {
        // Check if video is accessible
        const response = await fetch(src, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Video not accessible: ${response.status}`);
        }
        
        // Wait for video to be ready
        if (videoRef.current) {
          videoRef.current.load();
        }
      } catch (err) {
        console.error('Error preloading video:', err);
        setError(err instanceof Error ? err : new Error('Unknown error loading video'));
        if (onError) onError(err instanceof Error ? err : new Error('Unknown error loading video'));
      }
    };
    
    preloadVideo();
  }, [src, onError]);
  
  const handleCanPlay = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };
  
  const handleError = () => {
    const videoError = videoRef.current?.error;
    const errorMessage = videoError 
      ? `Video error: ${videoError.message || videoError.code}` 
      : 'Unknown video error';
    
    setError(new Error(errorMessage));
    setIsLoading(false);
    
    if (onError) onError(new Error(errorMessage));
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
          <span>Error loading video: {error.message}</span>
          <button onClick={() => videoRef.current?.load()}>
            Retry
          </button>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="video-preview"
        controls
        preload="metadata"
        poster={poster}
        onCanPlay={handleCanPlay}
        onError={handleError}
        style={{ display: isLoading || error ? 'none' : 'block' }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
```

### Phase 3: Advanced Video Handling (4-8 weeks)

#### 3.1 Client-Side Compression

**Objective**: Implement optional client-side compression for videos

**Tasks**:
- [ ] Integrate FFmpeg.wasm for browser-based compression
- [ ] Add user options for quality vs. speed
- [ ] Implement compression progress tracking

**Implementation**:
```typescript
// In src/lib/videoCompressor.ts
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Load FFmpeg only once
let ffmpegInstance: any = null;
const loadFFmpeg = async () => {
  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({ log: true });
    await ffmpegInstance.load();
  }
  return ffmpegInstance;
};

export interface CompressionOptions {
  quality: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: number) => void;
}

export async function compressVideo(
  file: File, 
  options: CompressionOptions = { quality: 'medium' }
): Promise<File> {
  const { quality, maxWidth = 1280, maxHeight = 720, onProgress } = options;
  
  // Load FFmpeg
  if (onProgress) onProgress(5);
  const ffmpeg = await loadFFmpeg();
  
  // Write the file to memory
  if (onProgress) onProgress(10);
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
  
  // Set compression parameters based on quality
  let crf, preset;
  switch (quality) {
    case 'low':
      crf = '28';
      preset = 'veryfast';
      break;
    case 'high':
      crf = '23';
      preset = 'medium';
      break;
    case 'medium':
    default:
      crf = '26';
      preset = 'fast';
      break;
  }
  
  // Set up progress tracking
  ffmpeg.setProgress(({ ratio }) => {
    if (onProgress) {
      // Scale progress from 20% to 90%
      const progress = 20 + Math.round(ratio * 70);
      onProgress(progress);
    }
  });
  
  // Run the compression command
  await ffmpeg.run(
    '-i', 'input.mp4',
    '-c:v', 'libx264',
    '-crf', crf,
    '-preset', preset,
    '-vf', `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    'output.mp4'
  );
  
  // Read the result
  if (onProgress) onProgress(95);
  const data = ffmpeg.FS('readFile', 'output.mp4');
  
  // Clean up
  ffmpeg.FS('unlink', 'input.mp4');
  ffmpeg.FS('unlink', 'output.mp4');
  
  // Create a new file from the compressed data
  if (onProgress) onProgress(100);
  return new File(
    [data.buffer],
    file.name.replace(/\.[^/.]+$/, "_compressed.mp4"),
    { type: 'video/mp4' }
  );
}
```

#### 3.2 Integration with Dedicated Video Service

**Objective**: Evaluate and integrate with a specialized video service

**Tasks**:
- [ ] Research and select a video service (Mux, Cloudinary, etc.)
- [ ] Implement server-side integration
- [ ] Update client-side code to work with the service

**Implementation**:
```typescript
// This is a placeholder for the integration code
// The actual implementation will depend on the selected service
// Example using Mux:

// In src/services/video/muxService.ts
import Mux from '@mux/mux-node';
import { v4 as uuidv4 } from 'uuid';

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID!,
  process.env.MUX_TOKEN_SECRET!
);

export async function createDirectUpload() {
  const upload = await Video.Uploads.create({
    cors_origin: '*',
    new_asset_settings: {
      playback_policy: 'public',
      mp4_support: 'standard'
    }
  });
  
  return {
    uploadUrl: upload.url,
    uploadId: upload.id
  };
}

export async function getAssetDetails(uploadId: string) {
  const upload = await Video.Uploads.get(uploadId);
  
  if (!upload.asset_id) {
    throw new Error('Asset not ready yet');
  }
  
  const asset = await Video.Assets.get(upload.asset_id);
  
  return {
    id: asset.id,
    playbackId: asset.playback_ids?.[0]?.id,
    status: asset.status,
    duration: asset.duration,
    aspectRatio: asset.aspect_ratio,
    maxResolution: asset.max_resolution,
    thumbnailUrl: asset.playback_ids?.[0]
      ? `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg`
      : undefined
  };
}
```

#### 3.3 Enhanced Video Player

**Objective**: Implement a custom video player optimized for the application

**Tasks**:
- [ ] Create a custom video player component
- [ ] Add support for adaptive streaming
- [ ] Implement advanced playback features

**Implementation**:
```typescript
// In src/components/player/VideoPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className = '',
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHLS, setIsHLS] = useState(false);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  
  useEffect(() => {
    if (!src || !videoRef.current) return;
    
    // Check if it's an HLS stream
    const isHLSSource = src.includes('.m3u8');
    setIsHLS(isHLSSource);
    
    if (isHLSSource && Hls.isSupported()) {
      // Clean up previous instance
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      
      // Create new HLS instance
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay && videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Error auto-playing video:', err);
          });
        }
        if (onReady) onReady();
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error');
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS fatal error:', data);
              if (onError) onError(new Error(`HLS error: ${data.details}`));
              break;
          }
        }
      });
      
      setHlsInstance(hls);
    } else {
      // Regular video source
      videoRef.current.src = src;
      if (autoPlay) {
        videoRef.current.play().catch(err => {
          console.error('Error auto-playing video:', err);
        });
      }
    }
    
    return () => {
      // Clean up
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [src, autoPlay, onReady, onError]);
  
  return (
    <div className={`custom-video-player ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={(e) => {
          if (onError) onError(new Error(`Video error: ${e.currentTarget.error?.message || 'Unknown error'}`));
        }}
        className="custom-video-element"
      >
        {!isHLS && <source src={src} type="video/mp4" />}
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
```

## Success Metrics

We will measure the success of this implementation plan using the following metrics:

1. **Upload Speed**: Average time to upload a 30MB video should be under 1 minute
2. **CPU Usage**: CPU usage during upload should not exceed 50% of baseline
3. **Preview Success Rate**: Video previews should load successfully >95% of the time
4. **User Satisfaction**: Measured through user feedback and engagement metrics

## Timeline and Resources

### Timeline

- **Phase 1**: 1-2 weeks
- **Phase 2**: 2-4 weeks
- **Phase 3**: 4-8 weeks

### Resource Requirements

- **Development**: 1-2 frontend developers, 1 backend developer
- **Testing**: QA resources for cross-browser and device testing
- **Infrastructure**: Potential costs for third-party video services
- **Design**: UI/UX input for progress indicators and player design

## Conclusion

This implementation plan provides a phased approach to improving video upload functionality in the Xeadline application. By addressing immediate issues first and then gradually implementing more advanced features, we can ensure a smooth transition to a more robust and user-friendly video upload experience.

The plan balances technical feasibility with user experience considerations, focusing on both client-side and server-side optimizations. Regular testing and feedback throughout the implementation process will help ensure that the final solution meets the needs of our users.