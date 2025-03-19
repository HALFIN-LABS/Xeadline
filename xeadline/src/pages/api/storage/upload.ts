import { NextApiRequest, NextApiResponse } from 'next';
import { storageService } from '../../../services/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Data, fileName, contentType, metadata } = req.body;

    if (!base64Data || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate content type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' });
    }

    // Decode base64 data
    const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64WithoutPrefix, 'base64');

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }

    // Use the storage service to store the file
    const result = await storageService.store(buffer, {
      contentType,
      metadata
    });

    // Return the URL
    return res.status(200).json({ url: result.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}