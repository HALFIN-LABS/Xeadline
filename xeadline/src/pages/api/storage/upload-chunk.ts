import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { uploadSessions } from './init-chunked-upload';

// Disable the default body parser to handle FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

// Create a temporary directory for storing chunks
const TMP_DIR = path.join(process.cwd(), 'tmp', 'uploads');

// Ensure the temporary directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming form data
    const form = formidable({ 
      maxFileSize: 5 * 1024 * 1024, // 5MB max chunk size
      keepExtensions: true,
      uploadDir: TMP_DIR
    });
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Get the upload ID, chunk index, and total chunks
    const uploadId = fields.uploadId?.[0];
    const chunkIndex = parseInt(fields.chunkIndex?.[0] || '0', 10);
    const totalChunks = parseInt(fields.totalChunks?.[0] || '0', 10);

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or create the upload session
    let session = uploadSessions.get(uploadId);
    if (!session) {
      console.error(`Upload session not found for ID: ${uploadId}`);
      console.log('Available sessions:', Array.from(uploadSessions.keys()));
      
      // Create a new session if it doesn't exist
      // This can happen if the server restarts or the session times out
      uploadSessions.set(uploadId, {
        fileName: fields.fileName?.[0] || 'unknown',
        contentType: fields.contentType?.[0] || 'application/octet-stream',
        fileSize: 0,
        totalChunks: totalChunks,
        metadata: {},
        receivedChunks: new Set<number>(),
        createdAt: new Date()
      });
      
      console.log(`Created new session for ID: ${uploadId}`);
      
      // Get the session again
      session = uploadSessions.get(uploadId);
      if (!session) {
        return res.status(500).json({ error: 'Failed to create upload session' });
      }
    }

    // Get the chunk file
    const fileArray = files.chunk;
    if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
      return res.status(400).json({ error: 'No chunk uploaded' });
    }
    
    const chunkFile = fileArray[0];

    // Create a directory for this upload if it doesn't exist
    const uploadDir = path.join(TMP_DIR, uploadId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move the chunk to the upload directory
    const chunkPath = path.join(uploadDir, `chunk-${chunkIndex}`);
    fs.renameSync(chunkFile.filepath, chunkPath);

    // Mark this chunk as received
    session.receivedChunks.add(chunkIndex);

    // Return success
    return res.status(200).json({
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
      progress: Math.round((session.receivedChunks.size / totalChunks) * 100)
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return res.status(500).json({
      error: 'Failed to upload chunk',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}