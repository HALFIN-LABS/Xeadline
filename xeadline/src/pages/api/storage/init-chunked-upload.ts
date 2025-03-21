import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for upload session data
 */
interface UploadSession {
  fileName: string;
  contentType: string;
  fileSize: number;
  totalChunks: number;
  metadata: any;
  receivedChunks: Set<number>;
  createdAt: Date;
}

/**
 * Map to store upload sessions
 * In a production environment, this would be stored in a database
 */
export const uploadSessions = new Map<string, UploadSession>();

/**
 * Initialize a chunked upload
 * This endpoint creates a new upload ID and prepares for receiving chunks
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get request body
    const { fileName, contentType, fileSize, totalChunks, metadata } = req.body;

    // Validate required fields
    if (!fileName || !contentType || !fileSize || !totalChunks) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'fileName, contentType, fileSize, and totalChunks are required'
      });
    }

    // Validate content type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const validTypes = [...validImageTypes, ...validVideoTypes];
    
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, MP4, MOV, WebM.'
      });
    }

    // Validate file size
    const isVideo = validVideoTypes.includes(contentType);
    const maxSize = isVideo
      ? 150 * 1024 * 1024  // 150MB for videos
      : 10 * 1024 * 1024;  // 10MB for images

    if (fileSize > maxSize) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`
      });
    }

    // Generate a unique upload ID
    const uploadId = uuidv4();

    // Store the upload session
    uploadSessions.set(uploadId, {
      fileName,
      contentType,
      fileSize,
      totalChunks,
      metadata,
      receivedChunks: new Set<number>(),
      createdAt: new Date()
    });
    
    console.log('Initialized chunked upload:', {
      uploadId,
      fileName,
      contentType,
      fileSize,
      totalChunks,
      metadata
    });
    
    // Set up a cleanup timeout for abandoned uploads (30 minutes)
    setTimeout(() => {
      if (uploadSessions.has(uploadId)) {
        console.log(`Cleaning up abandoned upload: ${uploadId}`);
        uploadSessions.delete(uploadId);
      }
    }, 30 * 60 * 1000);

    // Return the upload ID to the client
    return res.status(200).json({
      uploadId,
      message: 'Chunked upload initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing chunked upload:', error);
    return res.status(500).json({
      error: 'Failed to initialize chunked upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}