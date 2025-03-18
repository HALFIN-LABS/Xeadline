/**
 * Test endpoint for the Storage Service
 * 
 * This endpoint is used to test the Storage Service abstraction.
 * It provides a simple way to test the different operations.
 */
import { storageService } from '../../services/storage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the operation from the query
    const { operation, id } = req.query;

    if (!operation) {
      return res.status(400).json({ error: 'Missing operation parameter' });
    }

    let result;

    // Perform the requested operation
    switch (operation) {
      case 'info':
        // Return information about the storage service
        result = {
          defaultProvider: 'vercel-blob',
          providers: ['vercel-blob'],
          operations: ['info', 'list', 'get', 'url'],
        };
        break;

      case 'list':
        // List files
        const files = await storageService.list();
        result = {
          files,
          count: files.length,
        };
        break;

      case 'get':
        // Get a file
        if (!id) {
          return res.status(400).json({ error: 'Missing id parameter' });
        }

        const blob = await storageService.retrieve(id);
        if (!blob) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Convert blob to base64 for display
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        result = {
          id,
          size: blob.size,
          type: blob.type,
          preview: `data:${blob.type};base64,${base64.substring(0, 100)}...`,
        };
        break;

      case 'url':
        // Get the URL for a file
        if (!id) {
          return res.status(400).json({ error: 'Missing id parameter' });
        }

        const url = storageService.getUrl(id);
        result = {
          id,
          url,
        };
        break;

      default:
        return res.status(400).json({ error: `Unknown operation: ${operation}` });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in test-storage-service:', error);
    return res.status(500).json({
      error: 'Error testing storage service',
      details: error.message,
      name: error.name,
    });
  }
}