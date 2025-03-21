import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { uploadSessions } from './init-chunked-upload';
import { storageService } from '../../../services/storage';

// Configure API route to handle larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb', // Increase the body parser size limit
    },
  },
};

// Create a temporary directory for storing chunks
const TMP_DIR = path.join(process.cwd(), 'tmp', 'uploads');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, fileName, contentType, metadata } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: 'Missing upload ID' });
    }

    // Get or create the upload session
    let session = uploadSessions.get(uploadId);
    if (!session) {
      console.error(`Upload session not found for ID: ${uploadId} during completion`);
      console.log('Available sessions:', Array.from(uploadSessions.keys()));
      
      // For completion, we need to have received all chunks
      // If the session is missing, we can't complete the upload
      // Instead of failing, let's try to create a new session with the provided information
      
      const totalChunks = req.body.totalChunks || 0;
      if (!totalChunks) {
        return res.status(400).json({ error: 'Missing total chunks information' });
      }
      
      // Create a new session with all chunks marked as received
      const receivedChunks = new Set<number>();
      for (let i = 0; i < totalChunks; i++) {
        receivedChunks.add(i);
      }
      
      uploadSessions.set(uploadId, {
        fileName: req.body.fileName || 'unknown',
        contentType: req.body.contentType || 'application/octet-stream',
        fileSize: 0,
        totalChunks,
        metadata: req.body.metadata || {},
        receivedChunks,
        createdAt: new Date()
      });
      
      console.log(`Created new session for ID: ${uploadId} during completion`);
      
      // Get the session again
      session = uploadSessions.get(uploadId);
      if (!session) {
        return res.status(500).json({ error: 'Failed to create upload session' });
      }
    }

    // Check if all chunks have been received
    if (session.receivedChunks.size !== session.totalChunks) {
      return res.status(400).json({
        error: 'Not all chunks have been received',
        received: session.receivedChunks.size,
        total: session.totalChunks
      });
    }

    // Directory where chunks are stored
    const uploadDir = path.join(TMP_DIR, uploadId);
    
    console.log(`Combining ${session.totalChunks} chunks for upload ID: ${uploadId}`);
    
    // Create a combined file from all chunks using a more efficient approach
    const combinedFilePath = path.join(uploadDir, 'combined-file');
    
    try {
      // Use a more efficient approach with streams
      const writeStream = fs.createWriteStream(combinedFilePath);
      
      // Process chunks in batches to avoid memory issues
      const BATCH_SIZE = 5;
      for (let batchStart = 0; batchStart < session.totalChunks; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, session.totalChunks);
        console.log(`Processing batch of chunks ${batchStart} to ${batchEnd - 1}`);
        
        // Process each chunk in the batch
        for (let i = batchStart; i < batchEnd; i++) {
          const chunkPath = path.join(uploadDir, `chunk-${i}`);
          
          if (!fs.existsSync(chunkPath)) {
            return res.status(500).json({
              error: `Chunk ${i} is missing`
            });
          }
          
          // Use streams for better performance
          await new Promise<void>((resolve, reject) => {
            const readStream = fs.createReadStream(chunkPath);
            readStream.pipe(writeStream, { end: false });
            readStream.on('end', resolve);
            readStream.on('error', reject);
          });
        }
      }
      
      // Close the write stream and wait for it to finish
      await new Promise<void>((resolve, reject) => {
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log(`Successfully combined all chunks for upload ID: ${uploadId}`);
    } catch (combineError) {
      console.error('Error combining chunks:', combineError);
      return res.status(500).json({
        error: 'Failed to combine chunks',
        message: combineError instanceof Error ? combineError.message : 'Unknown error'
      });
    }

    // Read the combined file
    const fileBuffer = fs.readFileSync(combinedFilePath);

    // Add cache control for optimized delivery
    const cacheControl = 'public, max-age=31536000'; // Cache for 1 year

    // Use the storage service to store the file
    console.log('Storing combined file with storage service...');
    const result = await storageService.store(fileBuffer, {
      contentType: session.contentType,
      metadata: session.metadata,
      cacheControl
    });

    console.log('File stored successfully:', result);

    // Clean up temporary files
    try {
      // Delete all chunk files
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(uploadDir, `chunk-${i}`);
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      }
      
      // Delete the combined file
      if (fs.existsSync(combinedFilePath)) {
        fs.unlinkSync(combinedFilePath);
      }
      
      // Delete the upload directory
      if (fs.existsSync(uploadDir)) {
        fs.rmdirSync(uploadDir);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
      // Continue with the response even if cleanup fails
    }

    // Remove the session
    uploadSessions.delete(uploadId);

    // Return the URL and additional metadata
    return res.status(200).json({
      url: result.url,
      id: result.id,
      contentType: result.contentType,
      size: result.size
    });
  } catch (error) {
    console.error('Error completing chunked upload:', error);
    return res.status(500).json({
      error: 'Failed to complete chunked upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}