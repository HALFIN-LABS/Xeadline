import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Blob upload API called');
    console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    
    // Get the file data from the request body
    const { file, imageType, topicId } = req.body;
    
    if (!file || !file.data) {
      console.error('No file data provided in the request');
      return res.status(400).json({ error: 'No file data provided' });
    }
    
    console.log('File info received:', {
      type: file.type,
      name: file.name,
      dataLength: file.data.length,
      imageType,
      topicId
    });
    
    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return res.status(400).json({ error: 'File must be an image' });
    }
    
    // Generate a unique path for the file
    const timestamp = Date.now();
    const fileExtension = file.type.split('/')[1] || 'jpg';
    const fileName = `test-${imageType || 'unknown'}-${topicId || 'user'}-${timestamp}.${fileExtension}`;
    
    console.log('Generated filename:', fileName);
    
    // Extract the base64 data (remove the data URL prefix if present)
    let base64Data = file.data;
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    } else if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');
    console.log('Converted to buffer, size:', fileBuffer.length, 'bytes');
    
    // Upload to Vercel Blob - USE THE ACTUAL IMAGE DATA
    console.log('Uploading to Vercel Blob...');
    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    console.log('Upload successful, URL:', blob.url);
    
    // Return the URL of the uploaded file
    return res.status(200).json({
      url: blob.url,
      success: true,
    });
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Error uploading image',
      details: error.message,
      name: error.name,
    });
  }
}