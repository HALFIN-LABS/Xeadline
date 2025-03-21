import { NextApiRequest, NextApiResponse } from 'next';
import { storageService } from '../../../services/storage';

// Configure API route to handle larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase the body parser size limit
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Data, fileName, contentType, metadata } = req.body;

    if (!base64Data || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate content type based on media type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const validTypes = [...validImageTypes, ...validVideoTypes];
    
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, MP4, MOV, WebM.'
      });
    }

    // Determine max size based on content type
    const isVideo = validVideoTypes.includes(contentType);
    const maxSize = isVideo
      ? 150 * 1024 * 1024  // 150MB for videos
      : 10 * 1024 * 1024;  // 10MB for images

    // Decode base64 data
    let buffer: Buffer;
    if (typeof base64Data === 'string') {
      // Handle base64 string
      const mediaType = contentType.split('/')[0]; // 'image' or 'video'
      const base64WithoutPrefix = base64Data.replace(
        new RegExp(`^data:${mediaType}\\/\\w+;base64,`),
        ''
      );
      buffer = Buffer.from(base64WithoutPrefix, 'base64');
      
      // Check file size
      if (buffer.length > maxSize) {
        return res.status(400).json({
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Add cache control for optimized delivery
    const cacheControl = 'public, max-age=31536000'; // Cache for 1 year

    // Use the storage service to store the file
    const result = await storageService.store(buffer, {
      contentType,
      metadata,
      cacheControl
    });

    // Return the URL and additional metadata
    return res.status(200).json({
      url: result.url,
      id: result.id,
      contentType: result.contentType,
      size: result.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}