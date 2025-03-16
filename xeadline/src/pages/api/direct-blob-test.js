import { put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Direct Blob Test API called');
    console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    
    // Create a test image (a simple 1x1 pixel PNG)
    // This is a valid minimal PNG file (1x1 pixel, black)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const fileName = `direct-test-${timestamp}.png`;
    
    console.log('Generated test PNG, size:', pngData.length, 'bytes');
    console.log('Uploading to Vercel Blob with filename:', fileName);
    
    // Upload to Vercel Blob
    const blob = await put(fileName, pngData, {
      access: 'public',
      contentType: 'image/png',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    console.log('Upload successful, URL:', blob.url);
    
    // Return an HTML page with the image
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Direct Vercel Blob Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .result { background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin: 20px 0; }
          img { border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>Direct Vercel Blob Test</h1>
        <p>This test bypasses all custom code and directly uses the Vercel Blob API.</p>
        
        <div class="result">
          <h2>Test Results</h2>
          <p>A 1x1 pixel PNG image was created and uploaded to Vercel Blob.</p>
          <p>Image URL: <a href="${blob.url}" target="_blank">${blob.url}</a></p>
          <p>Content Type: ${blob.contentType}</p>
          <p>Size: ${pngData.length} bytes</p>
        </div>
        
        <h2>Image Preview</h2>
        <p>The image below should be a tiny black dot (1x1 pixel):</p>
        <img src="${blob.url}" alt="Test image" style="width: 100px; height: 100px; image-rendering: pixelated;">
        
        <h2>Raw Image (actual size)</h2>
        <img src="${blob.url}" alt="Test image">
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in direct blob test:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Error testing Vercel Blob',
      details: error.message,
      name: error.name,
    });
  }
}