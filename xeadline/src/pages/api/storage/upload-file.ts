import { NextApiRequest, NextApiResponse } from 'next';
import { storageService } from '../../../services/storage';
import formidable from 'formidable';
import fs from 'fs';

// Disable the default body parser to handle FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API endpoint to handle file uploads
 * This is a simplified version that avoids browser crashes
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming form data
    const form = formidable({
      maxFileSize: 150 * 1024 * 1024, // 150MB max file size for videos
      keepExtensions: true,
      multiples: false,
    });
    
    // Parse the form data
    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });
    
    // Get the file
    const fileArray = files.file;
    if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const file = fileArray[0];
    
    // Get metadata from fields
    const pathType = Array.isArray(fields.pathType) ? fields.pathType[0] : fields.pathType || 'post';
    const mediaType = Array.isArray(fields.mediaType) ? fields.mediaType[0] : fields.mediaType || 'image';
    const topicId = Array.isArray(fields.topicId) ? fields.topicId[0] : fields.topicId || 'default';
    const postId = Array.isArray(fields.postId) ? fields.postId[0] : fields.postId || 'new-post';
    const contentType = Array.isArray(fields.contentType) ? fields.contentType[0] : fields.contentType || file.mimetype || 'application/octet-stream';
    
    // Read the file
    const fileData = fs.readFileSync(file.filepath);
    
    // Add cache control for optimized delivery
    const cacheControl = 'public, max-age=31536000'; // Cache for 1 year
    
    // Use the storage service to store the file
    const result = await storageService.store(fileData, {
      contentType,
      metadata: {
        fileName: file.originalFilename || 'file',
        pathType,
        mediaType,
        topicId,
        postId,
        uploadedAt: new Date().toISOString()
      },
      cacheControl
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
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}