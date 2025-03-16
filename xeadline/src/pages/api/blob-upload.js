import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable built-in bodyParser to handle FormData
  },
};

// Helper function to parse form data using formidable
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data using formidable
    const { fields, files } = await parseForm(req);
    const file = files.file[0]; // formidable v4 returns an array for each field
    const imageType = fields.imageType ? fields.imageType[0] : 'unknown';
    const topicId = fields.topicId ? fields.topicId[0] : null;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Generate a unique path for the file
    const timestamp = Date.now();
    const fileExtension = file.originalFilename.split('.').pop();
    const fileName = `${imageType}-${topicId || 'user'}-${timestamp}.${fileExtension}`;

    // Read the file content
    const fileContent = fs.readFileSync(file.filepath);

    // Upload to Vercel Blob
    const blob = await put(fileName, fileContent, {
      access: 'public',
      contentType: file.mimetype,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Clean up the temp file
    fs.unlinkSync(file.filepath);

    // Return the URL of the uploaded file
    return res.status(200).json({
      url: blob.url,
      success: true,
    });
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return res.status(500).json({
      error: 'Error uploading image',
      details: error.message,
    });
  }
}