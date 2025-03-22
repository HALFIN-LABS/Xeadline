import { NextApiRequest, NextApiResponse } from 'next';
import { head } from '@vercel/blob';

/**
 * API endpoint to verify a direct upload to Vercel Blob
 * This checks if the file exists and returns the verified URL
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract pathname from query parameters
    const { pathname } = req.query;

    if (!pathname || typeof pathname !== 'string') {
      return res.status(400).json({
        error: 'Missing required parameter: pathname'
      });
    }

    // Verify the file exists in Vercel Blob
    try {
      const blob = await head(pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (!blob) {
        return res.status(404).json({
          error: 'File not found in storage',
          pathname
        });
      }

      // Construct the public URL
      const prefix = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL_PREFIX || 'https://vercel-blob-storage.public.blob.vercel-storage.com';
      const verifiedUrl = `${prefix}/${pathname}`;

      // Return the verified URL and metadata
      return res.status(200).json({
        verifiedUrl,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      });
    } catch (headError) {
      console.error('Error verifying blob existence:', headError);
      
      // If we can't verify, assume it exists and return a constructed URL
      const prefix = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL_PREFIX || 'https://vercel-blob-storage.public.blob.vercel-storage.com';
      const verifiedUrl = `${prefix}/${pathname}`;
      
      return res.status(200).json({
        verifiedUrl,
        pathname,
        verified: false,
        message: 'Could not verify upload, but returning constructed URL'
      });
    }
  } catch (error) {
    console.error('Error verifying upload:', error);
    return res.status(500).json({
      error: 'Failed to verify upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}