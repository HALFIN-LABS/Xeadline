import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

// Disable the default body parser to handle FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Simple endpoint for testing upload speed
 * This endpoint accepts a file upload and immediately returns success
 * It's used by the client to measure network upload speed
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming form data with minimal options
    const form = formidable({
      maxFileSize: 1024 * 1024, // 1MB max file size for speed test
      keepExtensions: false,
      multiples: false,
    });
    
    // Parse the form data
    await new Promise<void>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Error parsing speed test form data:', err);
          reject(err);
        } else {
          // Clean up any temporary files
          const fileArray = files.file;
          if (fileArray && Array.isArray(fileArray) && fileArray.length > 0) {
            const file = fileArray[0];
            try {
              if (fs.existsSync(file.filepath)) {
                fs.unlinkSync(file.filepath);
              }
            } catch (cleanupError) {
              console.error('Error cleaning up speed test file:', cleanupError);
              // Continue despite cleanup error
            }
          }
          resolve();
        }
      });
    });

    // Return success immediately
    return res.status(200).json({
      success: true,
      message: 'Speed test completed successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in speed test:', error);
    return res.status(500).json({
      error: 'Failed to process speed test',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}