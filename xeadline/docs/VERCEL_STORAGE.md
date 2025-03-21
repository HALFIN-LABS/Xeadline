# Vercel Blob Storage Integration

## Overview

Vercel Blob is a storage solution optimized for Vercel's serverless environment. It provides a simple way to store and serve files, with automatic CDN distribution for fast access worldwide.

## Key Features

- **Global CDN Distribution**: Files are automatically distributed across Vercel's global CDN
- **Serverless-Friendly**: Designed to work well with serverless functions
- **Simple API**: Easy-to-use SDK for uploading and managing files
- **Direct Uploads**: Support for client-side uploads with signed URLs
- **Access Control**: Public or private file access

## Implementation Approaches

### 1. Server-Side Uploads (Current Implementation)

In this approach, files are uploaded to the Vercel Blob storage through a Next.js API route:

```javascript
// API route handler
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  const blob = await put('file-name.ext', buffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });
  
  return res.status(200).json(blob);
}
```

**Pros**:
- Simple implementation
- Works for smaller files
- Good for authenticated uploads

**Cons**:
- Subject to API route timeouts (default 10s on Vercel)
- Consumes serverless function resources
- Not ideal for large files

### 2. Client-Side Direct Uploads (Recommended for Large Files)

This approach uses signed URLs to allow direct uploads from the client to Vercel Blob storage:

```javascript
// API route to get a signed URL
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  const { url, putToken } = await put({
    access: 'public',
    contentType: req.query.contentType,
  }, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  
  return res.status(200).json({ url, putToken });
}

// Client-side upload
const { url, putToken } = await fetch(`/api/get-upload-url?contentType=${file.type}`).then(r => r.json());
const uploadResult = await fetch(url, {
  method: 'PUT',
  headers: { 'x-token': putToken },
  body: file,
});
```

**Pros**:
- Bypasses API route timeouts
- More efficient for large files
- Reduces serverless function load

**Cons**:
- Slightly more complex implementation
- Requires additional API endpoint for URL signing

### 3. Chunked Uploads (For Very Large Files)

For very large files, implementing a chunked upload approach can be more reliable:

```javascript
// Client-side chunked upload
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

for (let i = 0; i < totalChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const chunk = file.slice(start, end);
  
  // Get signed URL for this chunk
  const { url, putToken } = await fetch(`/api/get-chunk-upload-url?part=${i}&totalParts=${totalChunks}`).then(r => r.json());
  
  // Upload chunk
  await fetch(url, {
    method: 'PUT',
    headers: { 'x-token': putToken },
    body: chunk,
  });
  
  // Update progress
  updateProgress((i + 1) / totalChunks * 100);
}

// Complete upload
await fetch('/api/complete-chunked-upload', {
  method: 'POST',
  body: JSON.stringify({ /* chunk metadata */ }),
});
```

**Pros**:
- Most reliable for very large files
- Provides granular progress tracking
- Can resume interrupted uploads

**Cons**:
- Most complex implementation
- Requires careful error handling

## Best Practices

1. **Choose the Right Approach**:
   - For small images (<1MB): Server-side uploads
   - For medium files (1-10MB): Client-side direct uploads
   - For large files (>10MB): Chunked uploads

2. **Error Handling**:
   - Implement retry logic for failed uploads
   - Provide clear error messages to users
   - Log detailed error information for debugging

3. **Progress Tracking**:
   - Use XMLHttpRequest for progress tracking
   - Provide visual feedback to users
   - Include estimated time remaining for large uploads

4. **Performance Optimization**:
   - Compress images before upload when possible
   - Use appropriate content types and cache settings
   - Consider implementing upload queues for multiple files

5. **Security Considerations**:
   - Validate file types and sizes
   - Use signed URLs with short expiration times
   - Implement proper access controls

## Vercel Blob SDK Reference

### Server-Side SDK

```javascript
import { put, del, list, head } from '@vercel/blob';

// Upload a file
const blob = await put('filename.jpg', buffer, {
  access: 'public', // or 'private'
  contentType: 'image/jpeg',
  cacheControl: 'public, max-age=31536000',
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

// Delete a file
await del(blobUrl);

// List files
const { blobs } = await list();

// Get file metadata
const { contentType, size } = await head(blobUrl);
```

### Client-Side Direct Uploads

```javascript
// Server-side: Generate a signed URL
const { url, putToken } = await put({
  access: 'public',
  contentType: 'image/jpeg',
}, {
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

// Client-side: Use the signed URL to upload
const result = await fetch(url, {
  method: 'PUT',
  headers: { 'x-token': putToken },
  body: file,
});
```

## Troubleshooting

### Common Issues

1. **Timeouts**:
   - API routes have a 10s timeout on Vercel's free tier
   - Use client-side direct uploads for larger files
   - Implement chunked uploads for very large files

2. **413 Payload Too Large**:
   - Next.js API routes have a default body size limit
   - Configure `api.bodyParser.sizeLimit` in API route config
   - Use client-side direct uploads to bypass this limit

3. **CORS Issues**:
   - Ensure proper CORS headers are set
   - Use the Vercel Blob SDK which handles CORS automatically

4. **Memory Limits**:
   - Serverless functions have memory limits
   - Avoid loading entire files into memory
   - Use streams or chunked uploads for large files

### Debugging Tips

1. Enable detailed logging in both client and server code
2. Check network requests in browser developer tools
3. Verify Vercel Blob token permissions
4. Test with smaller files to isolate issues
5. Check Vercel function logs for serverless errors
