import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Get the file and metadata
    const file = files.file;
    const imageType = fields.imageType;
    const topicId = fields.topicId;

    if (!file || !imageType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize Supabase client (server-side only)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
    );

    // Create a unique file path
    const fileExt = file.originalFilename.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = topicId
      ? `${topicId}/${imageType}/${fileName}`
      : `temp/${imageType}/${fileName}`;

    // Read the file
    const fileData = fs.readFileSync(file.filepath);

    // Bucket name
    const BUCKET_NAME = 'topic-image';

    // First try to list and remove existing files
    try {
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(topicId ? `${topicId}/${imageType}` : `temp/${imageType}`);

      if (existingFiles && existingFiles.length > 0) {
        // Remove existing files with the same prefix
        for (const existingFile of existingFiles) {
          await supabase.storage
            .from(BUCKET_NAME)
            .remove([`${topicId ? `${topicId}/${imageType}` : `temp/${imageType}`}/${existingFile.name}`]);
        }
      }
    } catch (listError) {
      console.warn('Error listing existing files:', listError);
      // Continue with upload even if listing fails
    }

    // Upload the file
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file', details: uploadError });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return res.status(500).json({ error: 'Failed to get public URL' });
    }

    // Return the public URL
    return res.status(200).json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Error handling upload:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}