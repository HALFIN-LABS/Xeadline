import { storageService } from '../../services/storage';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable built-in bodyParser to handle FormData
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Simple Blob upload API called');
    
    // Parse the form data
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    // Parse the form
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });
    
    console.log('Form parsed successfully');
    console.log('Fields:', fields);
    
    // Get the file - formidable v4 returns an object with file objects
    const fileKey = Object.keys(files)[0];
    const file = files[fileKey]?.[0] || files.file?.[0];
    
    if (!file) {
      console.error('No file found in the request');
      console.error('Files structure:', JSON.stringify(files));
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log('File details:', {
      name: file.originalFilename || file.originalName || 'unknown',
      type: file.mimetype || file.type || 'application/octet-stream',
      size: file.size,
      path: file.filepath || file.path
    });
    
    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename || file.originalName || 'file';
    const fileExtension = originalName.split('.').pop() || 'jpg';
    const fileName = `simple-${timestamp}.${fileExtension}`;
    
    // Get the file path
    const filePath = file.filepath || file.path;
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath);
    console.log('File content read, size:', fileContent.length);
    
    // Upload using the storage service
    console.log('Uploading using Storage Service...');
    const result = await storageService.store(fileContent, {
      contentType: file.mimetype || file.type || 'application/octet-stream',
      metadata: {
        fileName,
        originalName,
        ...fields // Include any other fields from the form
      }
    });
    
    console.log('Upload successful, URL:', result.url);
    
    // Clean up the temp file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error deleting temp file:', err);
      // Continue even if cleanup fails
    }
    
    // Return the URL of the uploaded file
    return res.status(200).json({
      url: result.url,
      success: true,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Error uploading image',
      details: error.message,
      name: error.name,
    });
  }
}