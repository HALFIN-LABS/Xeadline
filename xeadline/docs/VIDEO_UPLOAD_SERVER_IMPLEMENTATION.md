# Video Upload Server Implementation Guide

## Overview

This document provides detailed guidance for implementing the server-side components of the video upload system in Xeadline. It focuses on creating a robust, scalable, and efficient backend architecture to handle video uploads, processing, and storage.

## API Endpoints

### 1. Direct Upload URL Generation

#### Purpose
Generate a pre-signed URL for direct uploads to Vercel Blob storage, bypassing the need to proxy large files through API routes.

#### Implementation

```typescript
// src/pages/api/storage/get-direct-upload-url.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get query parameters
    const { fileName, contentType } = req.query;
    
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate content type
    const supportedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!supportedTypes.includes(contentType as string)) {
      return res.status(400).json({ error: 'Unsupported content type' });
    }
    
    // Generate a unique file name to prevent collisions
    const uniqueFileName = `${session.user.id}/${Date.now()}-${fileName}`;
    
    // Generate direct upload URL
    const { url, uploadUrl } = await put(uniqueFileName as string, {
      access: 'public',
      contentType: contentType as string,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    // Return URLs to client
    return res.status(200).json({ 
      url,       // The URL where the file will be accessible after upload
      uploadUrl  // The URL to upload the file to
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 2. Chunked Upload Initialization

#### Purpose
Initialize a chunked upload session for large files, generating a unique upload ID and preparing the server to receive chunks.

#### Implementation

```typescript
// src/pages/api/storage/init-chunked-upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { v4 as uuidv4 } from 'uuid';
import { createUploadSession } from '@/lib/uploadSessions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse request body
    const { fileName, fileSize, contentType, totalChunks } = req.body;
    
    // Validate required fields
    if (!fileName || !fileSize || !contentType || !totalChunks) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate file size
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (fileSize > maxFileSize) {
      return res.status(400).json({ error: 'File size exceeds maximum allowed size' });
    }
    
    // Validate content type
    const supportedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!supportedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported content type' });
    }
    
    // Generate upload ID
    const uploadId = uuidv4();
    
    // Create upload session
    await createUploadSession({
      id: uploadId,
      userId: session.user.id,
      fileName,
      fileSize,
      contentType,
      totalChunks,
      createdAt: new Date(),
      status: 'initialized',
      metadata: {}
    });
    
    // Return upload ID to client
    return res.status(200).json({ 
      uploadId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  } catch (error) {
    console.error('Error initializing chunked upload:', error);
    return res.status(500).json({ 
      error: 'Failed to initialize upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 3. Chunk Upload Handler

#### Purpose
Receive and store individual chunks of a file being uploaded in parts.

#### Implementation

```typescript
// src/pages/api/storage/upload-chunk.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { getUploadSession, updateUploadSession } from '@/lib/uploadSessions';

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse form data with formidable
    const { fields, files } = await parseForm(req);
    
    // Extract fields
    const uploadId = Array.isArray(fields.uploadId) ? fields.uploadId[0] : fields.uploadId;
    const chunkIndex = Array.isArray(fields.chunkIndex) ? parseInt(fields.chunkIndex[0]) : parseInt(fields.chunkIndex);
    
    if (!uploadId || isNaN(chunkIndex)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get upload session
    const uploadSession = await getUploadSession(uploadId);
    if (!uploadSession) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    // Verify user owns this upload
    if (uploadSession.userId !== session.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Verify chunk index is valid
    if (chunkIndex < 0 || chunkIndex >= uploadSession.totalChunks) {
      return res.status(400).json({ error: 'Invalid chunk index' });
    }
    
    // Get the uploaded chunk file
    const chunk = Array.isArray(files.chunk) ? files.chunk[0] : files.chunk;
    if (!chunk) {
      return res.status(400).json({ error: 'No chunk file provided' });
    }
    
    // Create chunks directory if it doesn't exist
    const chunksDir = path.join(process.env.UPLOAD_TMP_DIR || '/tmp', uploadId);
    await fs.mkdir(chunksDir, { recursive: true });
    
    // Move chunk to storage location
    const chunkPath = path.join(chunksDir, `chunk-${chunkIndex}`);
    await fs.copyFile(chunk.filepath, chunkPath);
    
    // Clean up temporary file
    await fs.unlink(chunk.filepath);
    
    // Update upload session
    await updateUploadSession(uploadId, {
      lastActivityAt: new Date(),
      receivedChunks: [...(uploadSession.receivedChunks || []), chunkIndex]
    });
    
    // Return success
    return res.status(200).json({ 
      success: true,
      chunkIndex,
      received: true
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return res.status(500).json({ 
      error: 'Failed to upload chunk',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to parse form data
function parseForm(req: NextApiRequest): Promise<{ fields: any, files: any }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB max chunk size
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}
```

### 4. Complete Chunked Upload

#### Purpose
Combine all uploaded chunks into a single file and store it in Vercel Blob storage.

#### Implementation

```typescript
// src/pages/api/storage/complete-chunked-upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { promises as fs } from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import { getUploadSession, updateUploadSession } from '@/lib/uploadSessions';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse request body
    const { uploadId, fileName, contentType } = req.body;
    
    if (!uploadId || !fileName || !contentType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get upload session
    const uploadSession = await getUploadSession(uploadId);
    if (!uploadSession) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    // Verify user owns this upload
    if (uploadSession.userId !== session.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Verify all chunks have been received
    const receivedChunks = uploadSession.receivedChunks || [];
    if (receivedChunks.length !== uploadSession.totalChunks) {
      return res.status(400).json({ 
        error: 'Not all chunks have been received',
        receivedChunks: receivedChunks.length,
        totalChunks: uploadSession.totalChunks
      });
    }
    
    // Create temporary file for combined chunks
    const chunksDir = path.join(process.env.UPLOAD_TMP_DIR || '/tmp', uploadId);
    const combinedFilePath = path.join(process.env.UPLOAD_TMP_DIR || '/tmp', `${uploadId}-combined`);
    
    // Combine chunks using streams for memory efficiency
    const combinedFileHandle = await fs.open(combinedFilePath, 'w');
    
    try {
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        const chunkPath = path.join(chunksDir, `chunk-${i}`);
        const chunkStream = createReadStream(chunkPath);
        await pipeline(chunkStream, combinedFileHandle.createWriteStream());
      }
    } finally {
      await combinedFileHandle.close();
    }
    
    // Generate a unique file name
    const uniqueFileName = `${session.user.id}/${Date.now()}-${fileName}`;
    
    // Upload combined file to Vercel Blob
    const fileBuffer = await fs.readFile(combinedFilePath);
    const blob = await put(uniqueFileName, fileBuffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    // Update upload session
    await updateUploadSession(uploadId, {
      status: 'completed',
      completedAt: new Date(),
      url: blob.url
    });
    
    // Clean up temporary files
    await fs.rm(chunksDir, { recursive: true, force: true });
    await fs.unlink(combinedFilePath);
    
    // Return success with URL
    return res.status(200).json({ 
      success: true,
      url: blob.url,
      contentType: blob.contentType,
      size: blob.size
    });
  } catch (error) {
    console.error('Error completing chunked upload:', error);
    return res.status(500).json({ 
      error: 'Failed to complete upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 5. Upload Status Check

#### Purpose
Allow clients to check the status of an ongoing upload, including which chunks have been received.

#### Implementation

```typescript
// src/pages/api/storage/upload-status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getUploadSession } from '@/lib/uploadSessions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get upload ID from query
    const { uploadId } = req.query;
    
    if (!uploadId) {
      return res.status(400).json({ error: 'Missing upload ID' });
    }
    
    // Get upload session
    const uploadSession = await getUploadSession(uploadId as string);
    if (!uploadSession) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    // Verify user owns this upload
    if (uploadSession.userId !== session.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Return upload status
    return res.status(200).json({ 
      uploadId: uploadSession.id,
      fileName: uploadSession.fileName,
      fileSize: uploadSession.fileSize,
      contentType: uploadSession.contentType,
      status: uploadSession.status,
      totalChunks: uploadSession.totalChunks,
      receivedChunks: uploadSession.receivedChunks || [],
      createdAt: uploadSession.createdAt,
      lastActivityAt: uploadSession.lastActivityAt,
      completedAt: uploadSession.completedAt,
      url: uploadSession.url
    });
  } catch (error) {
    console.error('Error getting upload status:', error);
    return res.status(500).json({ 
      error: 'Failed to get upload status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 6. Network Speed Test

#### Purpose
Provide a way for clients to measure their network speed to optimize chunk size and concurrency.

#### Implementation

```typescript
// src/pages/api/storage/network-test.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get requested size from query (default to 100KB)
    const sizeParam = req.query.size as string || '100kb';
    let size = 100 * 1024; // 100KB default
    
    if (sizeParam.endsWith('kb')) {
      size = parseInt(sizeParam.slice(0, -2)) * 1024;
    } else if (sizeParam.endsWith('mb')) {
      size = parseInt(sizeParam.slice(0, -2)) * 1024 * 1024;
    } else {
      size = parseInt(sizeParam);
    }
    
    // Limit maximum size to 1MB for security
    size = Math.min(size, 1024 * 1024);
    
    // Generate random data of the requested size
    const data = Buffer.alloc(size);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', size);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send the data
    res.status(200).send(data);
  } catch (error) {
    console.error('Error in network test:', error);
    res.status(500).json({ 
      error: 'Network test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

## Backend Services

### 1. Upload Session Management

#### Purpose
Manage the state of chunked uploads, tracking which chunks have been received and the overall upload status.

#### Implementation

```typescript
// src/lib/uploadSessions.ts
import { prisma } from '@/lib/prisma';

export interface UploadSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  totalChunks: number;
  receivedChunks?: number[];
  status: 'initialized' | 'in-progress' | 'completed' | 'failed';
  createdAt: Date;
  lastActivityAt?: Date;
  completedAt?: Date;
  url?: string;
  metadata: Record<string, any>;
}

export async function createUploadSession(session: UploadSession): Promise<UploadSession> {
  return prisma.uploadSession.create({
    data: {
      id: session.id,
      userId: session.userId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      contentType: session.contentType,
      totalChunks: session.totalChunks,
      receivedChunks: session.receivedChunks ? JSON.stringify(session.receivedChunks) : '[]',
      status: session.status,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt || session.createdAt,
      metadata: JSON.stringify(session.metadata || {})
    }
  }).then(formatUploadSession);
}

export async function getUploadSession(id: string): Promise<UploadSession | null> {
  const session = await prisma.uploadSession.findUnique({
    where: { id }
  });
  
  return session ? formatUploadSession(session) : null;
}

export async function updateUploadSession(
  id: string, 
  updates: Partial<UploadSession>
): Promise<UploadSession> {
  const session = await getUploadSession(id);
  if (!session) {
    throw new Error(`Upload session not found: ${id}`);
  }
  
  const data: any = { ...updates };
  
  // Handle receivedChunks specially
  if (updates.receivedChunks) {
    data.receivedChunks = JSON.stringify(updates.receivedChunks);
  } else if (updates.receivedChunks === undefined && session.receivedChunks) {
    // If we're adding a chunk to existing chunks
    const existingChunks = session.receivedChunks || [];
    if (updates.receivedChunks === undefined) {
      delete data.receivedChunks;
    }
  }
  
  // Handle metadata specially
  if (updates.metadata) {
    data.metadata = JSON.stringify({
      ...(session.metadata || {}),
      ...updates.metadata
    });
  }
  
  return prisma.uploadSession.update({
    where: { id },
    data
  }).then(formatUploadSession);
}

export async function deleteUploadSession(id: string): Promise<void> {
  await prisma.uploadSession.delete({
    where: { id }
  });
}

export async function listUserUploadSessions(
  userId: string,
  status?: 'initialized' | 'in-progress' | 'completed' | 'failed'
): Promise<UploadSession[]> {
  const where: any = { userId };
  if (status) {
    where.status = status;
  }
  
  const sessions = await prisma.uploadSession.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  
  return sessions.map(formatUploadSession);
}

export async function cleanupExpiredSessions(
  expirationHours: number = 24
): Promise<number> {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() - expirationHours);
  
  const result = await prisma.uploadSession.deleteMany({
    where: {
      status: { in: ['initialized', 'in-progress'] },
      lastActivityAt: { lt: expirationDate }
    }
  });
  
  return result.count;
}

// Helper function to format upload session from database
function formatUploadSession(session: any): UploadSession {
  return {
    ...session,
    receivedChunks: session.receivedChunks ? JSON.parse(session.receivedChunks) : [],
    metadata: session.metadata ? JSON.parse(session.metadata) : {}
  };
}
```

### 2. Storage Service Abstraction

#### Purpose
Provide a unified interface for different storage providers, allowing for easy switching between Vercel Blob and other services.

#### Implementation

```typescript
// src/lib/storage/storageService.ts
import { StorageProvider } from './providers/storageProvider';
import { VercelBlobProvider } from './providers/vercelBlobProvider';

export interface StorageOptions {
  contentType?: string;
  metadata?: Record<string, any>;
  cacheControl?: string;
  access?: 'public' | 'private';
}

export interface StorageResult {
  id: string;
  url: string;
  contentType: string;
  size: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class StorageService {
  private provider: StorageProvider;
  
  constructor(provider?: StorageProvider) {
    // Default to Vercel Blob provider if none specified
    this.provider = provider || new VercelBlobProvider();
  }
  
  async store(
    data: Blob | File | Buffer,
    options?: StorageOptions
  ): Promise<StorageResult> {
    return this.provider.store(data, options);
  }
  
  async delete(id: string): Promise<boolean> {
    return this.provider.delete(id);
  }
  
  async get(id: string): Promise<StorageResult | null> {
    return this.provider.get(id);
  }
  
  async getUploadUrl(
    fileName: string,
    options?: StorageOptions
  ): Promise<{ url: string; uploadUrl: string }> {
    return this.provider.getUploadUrl(fileName, options);
  }
}

// Create a singleton instance
export const storageService = new StorageService();
```

### 3. Vercel Blob Provider

#### Purpose
Implement the storage provider interface for Vercel Blob storage.

#### Implementation

```typescript
// src/lib/storage/providers/vercelBlobProvider.ts
import { StorageProvider } from './storageProvider';
import { StorageOptions, StorageResult } from '../storageService';
import { put, del, list, head } from '@vercel/blob';

export class VercelBlobProvider implements StorageProvider {
  async store(
    data: Blob | File | Buffer,
    options?: StorageOptions
  ): Promise<StorageResult> {
    // Determine file name
    let fileName: string;
    if (data instanceof File) {
      fileName = data.name;
    } else {
      fileName = `file-${Date.now()}`;
    }
    
    // Determine content type
    const contentType = options?.contentType || 
      (data instanceof File ? data.type : 'application/octet-stream');
    
    // Upload to Vercel Blob
    const blob = await put(fileName, data, {
      access: options?.access || 'public',
      contentType,
      cacheControlMaxAge: options?.cacheControl ? 
        parseInt(options.cacheControl.split('=')[1]) : undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });
    
    // Return storage result
    return {
      id: blob.pathname,
      url: blob.url,
      contentType: blob.contentType,
      size: data instanceof File ? data.size : 
            data instanceof Blob ? data.size : 
            (data as Buffer).length,
      metadata: options?.metadata,
      createdAt: new Date()
    };
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      await del(id, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return true;
    } catch (error) {
      console.error('Error deleting from Vercel Blob:', error);
      return false;
    }
  }
  
  async get(id: string): Promise<StorageResult | null> {
    try {
      const blob = await head(id, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      if (!blob) {
        return null;
      }
      
      return {
        id: blob.pathname,
        url: blob.url,
        contentType: blob.contentType,
        size: blob.size,
        createdAt: new Date(blob.uploadedAt)
      };
    } catch (error) {
      console.error('Error getting from Vercel Blob:', error);
      return null;
    }
  }
  
  async getUploadUrl(
    fileName: string,
    options?: StorageOptions
  ): Promise<{ url: string; uploadUrl: string }> {
    const contentType = options?.contentType || 'application/octet-stream';
    
    const { url, uploadUrl } = await put(fileName, {
      access: options?.access || 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });
    
    return { url, uploadUrl };
  }
}
```

### 4. Storage Provider Interface

#### Purpose
Define a common interface for all storage providers to implement.

#### Implementation

```typescript
// src/lib/storage/providers/storageProvider.ts
import { StorageOptions, StorageResult } from '../storageService';

export interface StorageProvider {
  store(
    data: Blob | File | Buffer,
    options?: StorageOptions
  ): Promise<StorageResult>;
  
  delete(id: string): Promise<boolean>;
  
  get(id: string): Promise<StorageResult | null>;
  
  getUploadUrl(
    fileName: string,
    options?: StorageOptions
  ): Promise<{ url: string; uploadUrl: string }>;
}
```

## Database Schema

### 1. Upload Sessions Table

#### Purpose
Store information about ongoing and completed uploads, including chunk tracking.

#### Implementation

```prisma
// prisma/schema.prisma
model UploadSession {
  id             String   @id
  userId         String
  fileName       String
  fileSize       Int
  contentType    String
  totalChunks    Int
  receivedChunks String   @default("[]") // JSON array of received chunk indices
  status         String   // 'initialized', 'in-progress', 'completed', 'failed'
  createdAt      DateTime
  lastActivityAt DateTime
  completedAt    DateTime?
  url            String?
  metadata       String   @default("{}") // JSON object for additional metadata

  @@index([userId, status])
  @@index([status, lastActivityAt]) // For cleanup queries
}
```

### 2. Video Metadata Table

#### Purpose
Store additional metadata about uploaded videos for efficient querying and display.

#### Implementation

```prisma
// prisma/schema.prisma
model VideoMetadata {
  id          String   @id @default(cuid())
  storageId   String   @unique // References the storage ID (pathname in Vercel Blob)
  userId      String
  title       String?
  description String?
  duration    Float    // In seconds
  width       Int
  height      Int
  fileSize    Int
  format      String
  codec       String?
  bitrate     Int?
  framerate   Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user        User     @relation(fields: [userId], references: [id])
  posts       Post[]   // Posts that use this video
  
  @@index([userId])
}
```

## Background Jobs

### 1. Cleanup Expired Upload Sessions

#### Purpose
Periodically clean up expired upload sessions and their associated temporary files.

#### Implementation

```typescript
// src/jobs/cleanupExpiredUploads.ts
import { cleanupExpiredSessions } from '@/lib/uploadSessions';
import { promises as fs } from 'fs';
import path from 'path';

export async function cleanupExpiredUploads(): Promise<void> {
  try {
    // Clean up expired sessions from database
    const deletedCount = await cleanupExpiredSessions(24); // 24 hours
    console.log(`Cleaned up ${deletedCount} expired upload sessions`);
    
    // Clean up temporary files
    const tmpDir = process.env.UPLOAD_TMP_DIR || '/tmp';
    const files = await fs.readdir(tmpDir);
    
    let cleanedFiles = 0;
    
    for (const file of files) {
      // Only process directories that look like upload IDs (UUIDs)
      if (file.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        const dirPath = path.join(tmpDir, file);
        
        try {
          // Check if directory is older than 24 hours
          const stats = await fs.stat(dirPath);
          const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageHours > 24) {
            await fs.rm(dirPath, { recursive: true, force: true });
            cleanedFiles++;
          }
        } catch (error) {
          console.error(`Error cleaning up directory ${dirPath}:`, error);
        }
      }
      
      // Also clean up combined files
      if (file.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-combined$/)) {
        const filePath = path.join(tmpDir, file);
        
        try {
          // Check if file is older than 24 hours
          const stats = await fs.stat(filePath);
          const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageHours > 24) {
            await fs.unlink(filePath);
            cleanedFiles++;
          }
        } catch (error) {
          console.error(`Error cleaning up file ${filePath}:`, error);
        }
      }
    }
    
    console.log(`Cleaned up ${cleanedFiles} temporary files`);
  } catch (error) {
    console.error('Error in cleanup job:', error);
  }
}
```

### 2. Video Transcoding (Optional)

#### Purpose
Process uploaded videos to generate optimized versions for different devices and network conditions.

#### Implementation

```typescript
// src/jobs/transcodeVideo.ts
import { getUploadSession, updateUploadSession } from '@/lib/uploadSessions';
import { storageService } from '@/lib/storage/storageService';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TranscodeOptions {
  uploadId: string;
  outputFormats: Array<{
    name: string;
    width: number;
    height: number;
    bitrate: string;
  }>;
}

export async function transcodeVideo(options: TranscodeOptions): Promise<void> {
  const { uploadId, outputFormats } = options;
  
  try {
    // Get upload session
    const session = await getUploadSession(uploadId);
    if (!session || session.status !== 'completed' || !session.url) {
      throw new Error(`Invalid upload session: ${uploadId}`);
    }
    
    // Create temporary directory for transcoding
    const tmpDir = path.join(process.env.UPLOAD_TMP_DIR || '/tmp', `transcode-${uploadId}`);
    await fs.mkdir(tmpDir, { recursive: true });
    
    try {
      // Download the original video
      const originalPath = path.join(tmpDir, 'original');
      await downloadFile(session.url, originalPath);
      
      // Transcode to each format
      const results = [];
      
      for (const format of outputFormats) {
        const outputPath = path.join(tmpDir, `${format.name}.mp4`);
        
        // Transcode using FFmpeg
        await transcodeWithFFmpeg(originalPath, outputPath, {
          width: format.width,
          height: format.height,
          bitrate: format.bitrate
        });
        
        // Upload transcoded file
        const fileBuffer = await fs.readFile(outputPath);
        const result = await storageService.store(fileBuffer, {
          contentType: 'video/mp4',
          metadata: {
            originalUploadId: uploadId,
            format: format.name,
            width: format.width,
            height: format.height,
            bitrate: format.bitrate
          }
        });
        
        results.push({
          format: format.name,
          url: result.url,
          width: format.width,
          height: format.height,
          bitrate: format.bitrate
        });
      }
      
      // Update upload session with transcoded versions
      await updateUploadSession(uploadId, {
        metadata: {
          ...session.metadata,
          transcodedVersions: results
        }
      });
      
      console.log(`Transcoded video ${uploadId} to ${results.length} formats`);
    } finally {
      // Clean up temporary directory
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`Error transcoding video ${uploadId}:`, error);
    throw error;
  }
}

// Helper function to download a file
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

// Helper function to transcode with FFmpeg
async function transcodeWithFFmpeg(
  inputPath: string,
  outputPath: string,
  options: {
    width: number;
    height: number;
    bitrate: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-b:v', options.bitrate,
      '-maxrate', options.bitrate,
      '-bufsize', `${parseInt(options.bitrate) * 2}`,
      '-vf', `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', // Overwrite output file if it exists
      outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}
```

## Performance Optimization

### 1. Memory Efficiency

#### Streaming File Handling

Instead of loading entire files into memory, use streams to process them:

```typescript
// Example of memory-efficient chunk combining
async function combineChunks(
  uploadId: string,
  totalChunks: number,
  outputPath: string
): Promise<void> {
  const chunksDir = path.join(process.env.UPLOAD_TMP_DIR || '/tmp', uploadId);
  const outputFile = await fs.open(outputPath, 'w');
  
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, `chunk-${i}`);
      const chunkStream = createReadStream(chunkPath);
      await pipeline(chunkStream, outputFile.createWriteStream());
    }
  } finally {
    await outputFile.close();
  }
}
```

#### Chunked Database Queries

For large datasets, use pagination to avoid memory issues:

```typescript
async function processAllUploadSessions(
  batchSize: number = 100
): Promise<void> {
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    const sessions = await prisma.uploadSession.findMany({
      take: batchSize,
      skip,
      orderBy: { createdAt: 'asc' }
    });
    
    if (sessions.length === 0) {
      hasMore = false;
      break;
    }
    
    // Process batch
    for (const session of sessions) {
      await processSession(session);
    }
    
    skip += batchSize;
  }
}
```

### 2. CPU Optimization

#### Worker Threads for Intensive Tasks

Offload CPU-intensive tasks to worker threads:

```typescript
// src/lib/workers/transcodeWorker.ts
import { Worker } from 'worker_threads';
import path from 'path';

export function transcodeInWorker(
  inputPath: string,
  outputPath: string,
  options: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'transcodeWorkerScript.js'), {
      workerData: {
        inputPath,
        outputPath,
        options
      }
    });
    
    worker.on('message', (message) => {
      if (message.type === 'done') {
        resolve();
      }
    });
    
    worker.on('error', reject);
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
```

#### Batch Processing

Process multiple items in batches to reduce overhead:

```typescript
async function processUploads(uploadIds: string[]): Promise<void> {
  // Process in batches of 10
  const batchSize = 10;
  
  for (let i = 0; i < uploadIds.length; i += batchSize) {
    const batch = uploadIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => processUpload(id)));
  }
}
```

### 3. Disk I/O Optimization

#### Temporary File Management

Implement a strategy to manage temporary files:

```typescript
// src/lib/tempFileManager.ts
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class TempFileManager {
  private baseDir: string;
  private files: Set<string> = new Set();
  
  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_TMP_DIR || '/tmp';
  }
  
  async createTempDir(): Promise<string> {
    const dirPath = path.join(this.baseDir, uuidv4());
    await fs.mkdir(dirPath, { recursive: true });
    this.files.add(dirPath);
    return dirPath;
  }
  
  async createTempFile(extension?: string): Promise<string> {
    const filePath = path.join(this.baseDir, `${uuidv4()}${extension ? `.${extension}` : ''}`);
    await fs.writeFile(filePath, '');
    this.files.add(filePath);
    return filePath;
  }
  
  async cleanup(): Promise<void> {
    const promises = Array.from(this.files).map(async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          await fs.unlink(filePath);
        }
      } catch (error) {
        console.error(`Error cleaning up ${filePath}:`, error);
      }
    });
    
    await Promise.all(promises);
    this.files.clear();
  }
}
```

#### File System Caching

Implement caching for frequently accessed files:

```typescript
// src/lib/fileCache.ts
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

interface CacheEntry {
  path: string;
  expires: number;
}

export class FileCache {
  private cacheDir: string;
  private entries: Map<string, CacheEntry> = new Map();
  private maxAge: number; // milliseconds
  
  constructor(cacheDir?: string, maxAgeMinutes: number = 60) {
    this.cacheDir = cacheDir || path.join(process.env.UPLOAD_TMP_DIR || '/tmp', 'file-cache');
    this.maxAge = maxAgeMinutes * 60 * 1000;
  }
  
  async init(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }
  
  async get(key: string): Promise<Buffer | null> {
    const entry = this.entries.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expires) {
      this.entries.delete(key);
      try {
        await fs.unlink(entry.path);
      } catch (error) {
        console.error(`Error deleting expired cache entry ${entry.path}:`, error);
      }
      return null;
    }
    
    try {
      return await fs.readFile(entry.path);
    } catch (error) {
      console.error(`Error reading cache entry ${entry.path}:`, error);
      this.entries.delete(key);
      return null;
    }
  }
  
  async set(key: string, data: Buffer): Promise<void> {
    // Create hash of key for filename
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const filePath = path.join(this.cacheDir, hash);
    
    await fs.writeFile(filePath, data);
    
    this.entries.set(key, {
      path: filePath,
      expires: Date.now() + this.maxAge
    });
  }
  
  async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.expires) {
        this.entries.delete(key);
        try {
          await fs.unlink(entry.path);
        } catch (error) {
          console.error(`Error deleting expired cache entry ${entry.path}:`, error);
        }
      }
    }
  }
}
```

## Security Considerations

### 1. Authentication and Authorization

#### Secure API Routes

Ensure all API routes are properly authenticated:

```typescript
// Middleware for API route authentication
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return handler(req, res, session.user.id);
  };
}
```

#### Resource Ownership Verification

Always verify that users can only access their own resources:

```typescript
// Example of ownership verification
async function verifyUploadOwnership(
  uploadId: string,
  userId: string
): Promise<boolean> {
  const session = await getUploadSession(uploadId);
  return session !== null && session.userId === userId;
}
```

### 2. Input Validation

#### Request Validation

Validate all incoming request data:

```typescript
// Example of request validation
import { z } from 'zod';

const InitUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(500 * 1024 * 1024), // 500MB max
  contentType: z.string().refine(
    type => ['video/mp4', 'video/quicktime', 'video/webm'].includes(type),
    { message: 'Unsupported content type' }
  ),
  totalChunks: z.number().int().positive().max(1000)
});

function validateInitUploadRequest(data: any): { 
  success: boolean; 
  data?: any; 
  error?: string;
} {
  try {
    const validated = InitUploadSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Invalid request data' };
  }
}
```

#### File Type Verification

Verify file types beyond just checking the content type:

```typescript
// Example of file type verification
import fileType from 'file-type';

async function verifyVideoFile(filePath: string): Promise<boolean> {
  try {
    const buffer = await fs.readFile(filePath, { length: 4100 }); // Read first 4100 bytes
    const type = await fileType.fromBuffer(buffer);
    
    if (!type) {
      return false;
    }
    
    return ['video/mp4', 'video/quicktime', 'video/webm'].includes(type.mime);
  } catch (error) {
    console.error('Error verifying file type:', error);
    return false;
  }
}
```

### 3. Rate Limiting

#### API Rate Limiting

Implement rate limiting for API routes:

```typescript
// src/lib/rateLimit.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

interface RateLimitOptions {
  limit: number;      // Maximum requests
  window: number;     // Time window in seconds
  identifier?: (req: NextApiRequest) => string; // Function to get identifier
}

export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: RateLimitOptions
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { limit, window, identifier } = options;
    
    // Get identifier (default to IP address)
    const id = identifier ? 
      identifier(req) : 
      (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown');
    
    const key = `rate-limit:${id}:${req.method}:${req.url}`;
    
    try {
      // Increment counter
      const count = await redis.incr(key);
      
      // Set expiry on first request
      if (count === 1) {
        await redis.expire(key, window);
      }
      
      // Get remaining time
      const ttl = await redis.ttl(key);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
      res.setHeader('X-RateLimit-Reset', ttl);
      
      // Check if rate limit exceeded
      if (count > limit) {
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: ttl
        });
      }
      
      // Continue to handler
      return handler(req, res);
    } catch (error) {
      console.error('Rate limit error:', error);
      
      // Continue to handler even if rate limiting fails
      return handler(req, res);
    }
  };
}
```

#### Upload Limits

Implement limits on uploads per user:

```typescript
// Example of upload limits
async function checkUserUploadLimits(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Check daily upload count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyUploads = await prisma.uploadSession.count({
    where: {
      userId,
      createdAt: { gte: today }
    }
  });
  
  if (dailyUploads >= 10) {
    return { 
      allowed: false,
      reason: 'Daily upload limit reached (10 uploads per day)'
    };
  }
  
  // Check total storage used
  const totalStorage = await prisma.videoMetadata.aggregate({
    where: { userId },
    _sum: { fileSize: true }
  });
  
  const storageUsed = totalStorage._sum.fileSize || 0;
  const storageLimit = 1024 * 1024 * 1024; // 1GB
  
  if (storageUsed >= storageLimit) {
    return {
      allowed: false,
      reason: 'Storage limit reached (1GB)'
    };
  }
  
  return { allowed: true };
}
```

## Deployment Considerations

### 1. Environment Configuration

#### Required Environment Variables

```
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Database
DATABASE_URL=your_database_url

# Temporary File Storage
UPLOAD_TMP_DIR=/tmp/xeadline-uploads

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_nextauth_url

# Optional: Redis for rate limiting
REDIS_URL=your_redis_url
```

#### Vercel Configuration

For Vercel deployment, add the following to `vercel.json`:

```json
{
  "functions": {
    "api/storage/upload-chunk.ts": {
      "memory": 1024,
      "maxDuration": 60
    },
    "api/storage/complete-chunked-upload.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### 2. Scaling Considerations

#### Serverless Function Limits

Be aware of serverless function limits:

- Vercel functions have a 50MB payload limit
- Function execution time is limited (10-60 seconds depending on plan)
- Memory is limited (1GB-4GB depending on plan)

#### Strategies for Large Files

For very large files:

1. Use direct upload URLs to bypass API routes
2. Implement resumable uploads with small chunks
3. Consider using a dedicated file upload service for files >500MB

#### Database Scaling

As upload volume grows:

1. Add indexes for frequently queried fields
2. Implement database sharding for upload sessions
3. Consider moving to a dedicated database for upload tracking

## Conclusion

This server implementation guide provides a comprehensive approach to creating a robust, scalable backend for video uploads in Xeadline. By implementing these components and strategies, you can ensure that video uploads are handled efficiently and reliably, even at scale.

Key takeaways:

1. **Chunked Uploads**: Implement chunked uploads for large files to improve reliability
2. **Storage Abstraction**: Use a storage service abstraction to allow for future flexibility
3. **Security First**: Implement proper authentication, validation, and rate limiting
4. **Performance Optimization**: Use streaming, worker threads, and caching for better performance
5. **Scalability**: Design with scaling in mind from the beginning

By following these guidelines, you can create a video upload backend that meets the needs of Xeadline users while maintaining high performance, security, and reliability.