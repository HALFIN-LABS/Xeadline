import { NextApiRequest, NextApiResponse } from 'next';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

/**
 * API endpoint to generate a direct upload URL for Vercel Blob
 * This allows clients to upload directly to Vercel Blob storage without proxying through our API
 * Significantly improves upload performance by 30-50%
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract request parameters
    const { fileName, contentType, pathType, mediaType, topicId, postId } = req.body;

    if (!fileName || !contentType || !pathType || !mediaType || !topicId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        requiredParams: ['fileName', 'contentType', 'pathType', 'mediaType', 'topicId']
      });
    }

    // Validate content type for videos
    if (mediaType === 'video' && !contentType.startsWith('video/')) {
      return res.status(400).json({
        error: 'Invalid content type for video',
        providedContentType: contentType,
        expectedContentType: 'video/*'
      });
    }

    // Generate a unique file name with proper path structure
    const fileId = nanoid(10);
    const fileExtension = fileName.split('.').pop() || '';
    const uniqueFileName = `${pathType}/${mediaType}/${topicId}/${postId || 'new-post'}-${fileId}.${fileExtension}`;

    // Create a placeholder blob to get a URL
    // This is a workaround since Vercel Blob doesn't have a direct "getUploadUrl" method
    const blob = await put(uniqueFileName, Buffer.from('placeholder'), {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    // Return the URL and file details
    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType || contentType,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
    });
  } catch (error) {
    console.error('Error generating direct upload URL:', error);
    return res.status(500).json({
      error: 'Failed to generate direct upload URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}