import { NextApiRequest, NextApiResponse } from 'next';
import nostrService from '../../../../services/nostr/nostrService';
import { EVENT_TYPES } from '../../../../constants/eventTypes';
import { Event, Filter } from 'nostr-tools';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: postId } = req.query;
  const { sort = 'popular' } = req.query;

  if (!postId || typeof postId !== 'string') {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  try {
    // Create filters to fetch comments for this post
    const filters: Filter[] = [
      {
        kinds: [EVENT_TYPES.COMMENT], // Use the correct event kind for comments (33305)
        '#e': [postId], // Events that reference this post
        limit: 100
      }
    ];
    
    // Fetch comments from Nostr relays
    console.log(`Fetching comments for post ${postId} with filters:`, JSON.stringify(filters));
    const events = await nostrService.getEvents(filters);
    console.log(`Found ${events.length} comment events for post ${postId}`);
    
    if (events.length > 0) {
      console.log('First comment event:', JSON.stringify(events[0]));
    }
    
    // Transform events to comment format
    const comments = events.map((event: Event) => {
      let content;
      try {
        content = JSON.parse(event.content);
      } catch (e) {
        // Fallback if content is not valid JSON
        content = { text: event.content };
      }
      
      // Find the reply reference if any
      // Look for a tag with format ['e', commentId, '', 'reply']
      const replyTo = event.tags.find((tag: string[]) =>
        tag[0] === 'e' && tag[3] === 'reply' && tag[1] !== postId
      )?.[1];
      
      return {
        id: event.id,
        pubkey: event.pubkey,
        content,
        createdAt: event.created_at,
        likes: 0, // This would need to be calculated from reactions
        userVote: null, // This would need to be determined based on user's reactions
        replyTo
      };
    });
    
    // Sort comments based on the selected sort option
    let sortedComments = [...comments];
    
    switch (sort) {
      case 'popular':
        // For now, just sort by creation time since we don't have likes
        sortedComments.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'newest':
        sortedComments.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        sortedComments.sort((a, b) => a.createdAt - b.createdAt);
        break;
      default:
        sortedComments.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    res.status(200).json({ comments: sortedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}