import { NextApiRequest, NextApiResponse } from 'next';
import { storageService } from '../../../services/storage';
import formidable from 'formidable';
import fs from 'fs';

// Disable the default body parser to handle FormData
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb', // As per the optimization plan
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming form data with stable, well-documented options
    const form = formidable({
      maxFileSize: 150 * 1024 * 1024, // 150MB max file size
      keepExtensions: true,
      multiples: false, // We only handle one file at a time
    });
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parsing error:', err);
          reject(err);
        } else {
          resolve([fields, files]);
        }
      });
    });

    // Get the file and metadata
    const fileArray = files.file;
    if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = fileArray[0];

    // Get metadata from fields
    const fileName = fields.fileName?.[0] || file.originalFilename || 'unknown';
    const contentType = fields.contentType?.[0] || file.mimetype || 'application/octet-stream';
    const metadata = fields.metadata?.[0] ? JSON.parse(fields.metadata[0]) : {};

    // Validate content type
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

    // Check file size
    const stats = fs.statSync(file.filepath);
    if (stats.size > maxSize) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`
      });
    }

    // Read the file directly - simple and reliable approach
    const buffer = fs.readFileSync(file.filepath);

    // Add cache control for optimized delivery
    const cacheControl = 'public, max-age=31536000'; // Cache for 1 year

    // Check if the BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set in environment variables');
      return res.status(500).json({
        error: 'Storage configuration error',
        message: 'BLOB_READ_WRITE_TOKEN is not set in environment variables'
      });
    }

    // Log file details
    console.log('Attempting to store file with storage service...');
    console.log('File details:', {
      fileName,
      contentType,
      size: buffer.length,
      metadata
    });

    // Log more details for video uploads
    if (isVideo) {
      console.log('Processing video upload:', {
        fileName,
        contentType,
        size: buffer.length,
        metadata
      });
    }

    // Use the storage service to store the file
    // Using Vercel's recommended approach
    const result = await storageService.store(buffer, {
      contentType,
      metadata: {
        ...metadata,
        fileName,
        originalName: file.originalFilename,
        uploadedAt: new Date().toISOString()
      },
      cacheControl
    });

    console.log('File stored successfully:', {
      url: result.url,
      id: result.id,
      contentType: result.contentType,
      size: result.size
    });

    // Clean up the temporary file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
      // Continue despite cleanup error
    }

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
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}