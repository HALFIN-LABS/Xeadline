import { NextApiRequest, NextApiResponse } from 'next';
import { signEvent, publishEvent } from '../../../../services/eventManagement';
import { EVENT_TYPES } from '../../../../constants/eventTypes';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: postId } = req.query;
  const { content, parentCommentId, pubkey, privateKey, media, mediaTypes, thumbnails } = req.body;

  if (!postId || typeof postId !== 'string') {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  if (!content || !pubkey) {
    return res.status(400).json({ error: 'Content and pubkey are required' });
  }

  if (!privateKey) {
    return res.status(400).json({ error: 'Private key is required for signing' });
  }

  try {
    // Generate a unique identifier for the 'd' tag (required for addressable events)
    const uniqueId = uuidv4();
    
    // Prepare tags for the comment event
    const tags = [
      ['e', postId as string, '', 'root'], // Reference to the post as the root
      ['d', uniqueId] // Add the 'd' tag required for addressable events
    ];
    
    // If this is a reply to another comment, add that reference
    if (parentCommentId) {
      tags.push(['e', parentCommentId, '', 'reply']);
    }
    
    // Prepare content with media if present
    const eventContent = JSON.stringify({
      text: content,
      media: media && media.length > 0 ? media : undefined,
      mediaTypes: mediaTypes && mediaTypes.length > 0 ? mediaTypes : undefined,
      thumbnails: thumbnails && thumbnails.length > 0 ? thumbnails : undefined
    });
    
    // Create an unsigned event
    const unsignedEvent = {
      kind: EVENT_TYPES.COMMENT, // Use the correct event kind for comments (33305)
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: eventContent,
      pubkey
    };
    
    // Sign the event with the provided private key
    const signingResult = await signEvent(unsignedEvent, { privateKey });
    
    if (!signingResult.success || !signingResult.event) {
      throw new Error('Failed to sign comment: ' + (signingResult.error || 'Unknown error'));
    }
    
    // Publish the signed event
    const publishedRelays = await publishEvent(signingResult.event);
    
    if (publishedRelays.length === 0) {
      throw new Error('Failed to publish comment: No relays received the event');
    }
    
    // Log success for debugging
    console.log('Comment published successfully to relays:', publishedRelays);
    
    res.status(200).json({ 
      success: true, 
      message: 'Comment added successfully',
      event: signingResult.event.id,
      publishedTo: publishedRelays
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      error: 'Failed to add comment', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
}