import { put } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    console.log('Testing Vercel Blob API');
    console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log('BLOB_READ_WRITE_TOKEN value (first 10 chars):',
      process.env.BLOB_READ_WRITE_TOKEN ?
      process.env.BLOB_READ_WRITE_TOKEN.substring(0, 10) + '...' :
      'undefined');
    
    // Create a simple text file
    const content = 'Hello World! This is a test file created at ' + new Date().toISOString();
    const fileName = `test-${Date.now()}.txt`;
    
    console.log('Uploading test file:', fileName);
    console.log('Content length:', content.length);
    
    // Upload to Vercel Blob
    console.log('Calling put function with parameters:');
    console.log('- fileName:', fileName);
    console.log('- content length:', content.length);
    console.log('- options:', { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN ? 'provided' : 'missing' });
    
    const blob = await put(fileName, content, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    console.log('Upload successful!');
    console.log('Blob response:', {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      contentLength: blob.contentLength,
    });
    
    // Return the URL of the uploaded file
    return res.status(200).json({
      url: blob.url,
      success: true,
      message: 'Test file uploaded successfully',
      fileName,
      content,
      blobInfo: {
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentLength: blob.contentLength,
      }
    });
  } catch (error) {
    console.error('Error testing Vercel Blob:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check if it's a Vercel Blob specific error
    if (error.name === 'BlobError') {
      console.error('Vercel Blob Error:', error.code, error.message);
      return res.status(400).json({
        error: 'Vercel Blob Error',
        code: error.code,
        details: error.message,
      });
    }
    
    return res.status(500).json({
      error: 'Error testing Vercel Blob',
      details: error.message,
      name: error.name,
    });
  }
}