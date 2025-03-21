import { NextApiRequest, NextApiResponse } from 'next';
import { put } from '@vercel/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get content type from query
    const contentType = req.query.contentType as string;
    if (!contentType) {
      return res.status(400).json({ error: 'Content type is required' });
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

    // Check if the BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set in environment variables');
      return res.status(500).json({
        error: 'Storage configuration error',
        message: 'BLOB_READ_WRITE_TOKEN is not set in environment variables'
      });
    }

    // Generate a unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExtension = contentType.split('/')[1].replace('quicktime', 'mov');
    const fileName = `upload-${timestamp}-${randomString}.${fileExtension}`;

    // Get the path parameters from query
    const pathType = req.query.pathType as string || 'post';
    const mediaType = req.query.mediaType as string || (contentType.startsWith('image') ? 'image' : 'video');
    const topicId = req.query.topicId as string || 'default';
    const postId = req.query.postId as string || 'new-post';

    // Create a path for the file
    const filePath = `${pathType}/${mediaType}/${topicId}/${postId}/${fileName}`;

    // For Vercel Blob, we need to create a proper URL
    // We'll use a simpler approach that doesn't require creating a placeholder file
    
    // Generate a URL based on the Vercel Blob URL pattern
    const blobUrlPrefix = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL_PREFIX || 'https://vercel-blob-storage.public.blob.vercel-storage.com';
    const url = `${blobUrlPrefix}/${filePath}`;
    
    console.log('Generated direct URL:', url);

    // Return the URL to the client
    return res.status(200).json({
      url,
      fileName,
      contentType
    });
  } catch (error) {
    console.error('Error generating URL:', error);
    return res.status(500).json({
      error: 'Failed to generate upload URL',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}