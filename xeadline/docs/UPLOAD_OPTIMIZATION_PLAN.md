# Upload Optimization Plan for Xeadline

## Current Issues

1. **Upload Performance**: Video uploads are extremely slow despite fast internet connections (900mbps)
2. **CPU Usage**: High CPU usage during uploads causing device heating and fan activation
3. **Failed Uploads**: Files not appearing in Vercel Blob storage after upload attempts
4. **Video Preview**: Uploaded videos not displaying in the post creation modal
5. **New 500 Errors**: Recent optimization attempts have introduced server errors

## Root Causes Analysis

1. **Inefficient Upload Process**
   - Current implementation loads entire files into memory
   - No proper streaming or chunking for large files
   - Inefficient handling of FormData and file processing

2. **Vercel-Specific Constraints**
   - Serverless function execution time limits (may timeout for large uploads)
   - Memory limitations in serverless environments
   - API route body size limits

3. **Client-Side Implementation Issues**
   - Lack of proper progress tracking
   - No fallback mechanisms when uploads fail
   - Inefficient error handling

4. **Video Preview Problems**
   - MIME type or format compatibility issues
   - CORS restrictions preventing video loading
   - Improper video element configuration

## Detailed Implementation Plan

### Phase 1: Restore Basic Functionality (Rollback with Improvements)

1. **Revert to Last Working Implementation**
   - Restore original upload-file.ts endpoint but keep increased body size limits
   - Remove experimental streaming code that's causing 500 errors
   - Keep the improved video player component with better error handling

2. **Add Basic Progress Tracking**
   - Implement simple progress tracking using upload events
   - Use a more standard approach that doesn't interfere with the request
   - Add visual feedback in the UI without changing the core upload logic

3. **Improve Error Handling**
   - Add more detailed logging on both client and server
   - Implement proper error boundaries and fallbacks
   - Add retry mechanisms for failed uploads

### Phase 2: Optimize for Vercel Blob Storage

1. **Direct Upload Implementation**
   - Research and implement Vercel's recommended approach for large file uploads
   - Use the `@vercel/blob` client SDK directly where possible
   - Implement signed URL uploads for larger files to bypass API route limits

2. **Server-Side Optimizations**
   - Configure API routes with appropriate limits and timeouts
   - Optimize formidable configuration using only stable, well-documented options
   - Implement proper cleanup of temporary files

3. **Client-Side Optimizations**
   - Add client-side compression for images before upload
   - Implement proper file validation and type checking
   - Add connection speed detection to adjust upload strategy

### Phase 3: Advanced Features and Optimizations

1. **True Chunked Upload Implementation**
   - Implement proper chunked uploads using Vercel's recommended patterns
   - Use the blob.put() method with appropriate options
   - Add proper resumability for interrupted uploads

2. **Enhanced Progress Tracking**
   - Implement detailed progress tracking with speed and time estimates
   - Add cancellation capability for in-progress uploads
   - Provide visual feedback on upload stages (preparing, uploading, processing)

3. **Video Optimization**
   - Add client-side video compression options
   - Implement proper video format detection and conversion if needed
   - Add thumbnail generation for better preview experience

## Implementation Details

### API Routes Configuration

```javascript
// upload-file.ts
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};
```

### Formidable Configuration

```javascript
const form = formidable({ 
  maxFileSize: 150 * 1024 * 1024, // 150MB max file size
  keepExtensions: true,
  multiples: false,
});
```

### Vercel Blob Integration

```javascript
import { put } from '@vercel/blob';

// Use Vercel's recommended approach
const blob = await put(fileName, buffer, {
  access: 'public',
  contentType: contentType,
  token: process.env.BLOB_READ_WRITE_TOKEN,
});
```

### Progress Tracking Implementation

```javascript
// Client-side implementation
const xhr = new XMLHttpRequest();
xhr.open('POST', '/api/storage/upload-file');

xhr.upload.onprogress = (event) => {
  if (event.lengthComputable) {
    const progress = Math.round((event.loaded / event.total) * 100);
    updateProgress(progress);
  }
};
```

### Video Preview Improvements

```jsx
<video
  src={url}
  controls
  preload="metadata"
  playsInline
  className="w-full h-48 object-contain rounded-md bg-black"
  onError={(e) => {
    console.error('Video load error:', e);
    const video = e.currentTarget;
    video.load();
  }}
>
  Your browser does not support the video tag.
</video>
```

## Testing Strategy

1. **Unit Testing**
   - Test each upload component in isolation
   - Mock API responses and progress events
   - Verify error handling works as expected

2. **Integration Testing**
   - Test the full upload flow with different file types and sizes
   - Verify files appear correctly in Vercel Blob storage
   - Test with various network conditions

3. **Performance Testing**
   - Measure upload speeds before and after optimizations
   - Monitor CPU and memory usage during uploads
   - Test with various file sizes to identify bottlenecks

## Rollout Strategy

1. **Phased Approach**
   - Implement changes in phases to isolate potential issues
   - Start with restoring basic functionality
   - Add optimizations incrementally

2. **Monitoring**
   - Add detailed logging for upload processes
   - Monitor error rates and performance metrics
   - Set up alerts for upload failures

3. **Fallback Mechanisms**
   - Implement feature flags to quickly disable problematic features
   - Add fallback upload methods for critical functionality
   - Ensure graceful degradation when optimal methods fail

## Success Metrics

1. **Performance**
   - Upload speeds should utilize at least 50% of available bandwidth
   - CPU usage should remain below 30% during uploads
   - Large video files (150MB) should upload in under 3 minutes on a 100Mbps connection

2. **Reliability**
   - Upload success rate should be >99%
   - No 500 errors during normal operation
   - Proper error messages for client-side issues

3. **User Experience**
   - Accurate progress indication
   - Immediate preview of uploaded media
   - No UI freezing during uploads