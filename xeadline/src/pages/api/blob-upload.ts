import { NextApiRequest, NextApiResponse } from 'next';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import formidable from 'formidable';
import fs from 'fs';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({ multiples: false });
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get the file and metadata
    const file = files.file as formidable.File;
    const imageType = fields.imageType as string;
    const topicId = fields.topicId as string;

    if (!file || !imageType) {
      return res.status(400).json({ error: 'Missing file or image type' });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }

    // Generate a unique filename
    const uniqueId = nanoid();
    const extension = file.originalFilename?.split('.').pop() || 'jpg';
    const filename = `${imageType}-${uniqueId}.${extension}`;
    
    // Folder structure: topics/{topicId}/images/
    const folder = topicId ? `topics/${topicId}/images` : 'topics/images';
    const pathname = `${folder}/${filename}`;

    // Read the file
    const fileData = await fs.promises.readFile(file.filepath);

    // Upload to Vercel Blob
    const blob = await put(pathname, fileData, {
      contentType: file.mimetype || 'image/jpeg',
      access: 'public',
    });

    // Return the URL
    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}