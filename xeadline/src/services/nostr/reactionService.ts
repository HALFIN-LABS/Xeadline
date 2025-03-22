import { Event, Filter } from 'nostr-tools';
import nostrService from './nostrService';

/**
 * Fetches reactions for a list of content IDs
 * @param contentIds Array of content IDs to fetch reactions for
 * @param currentUserPubkey Optional pubkey of the current user to determine their votes
 * @returns Object mapping content IDs to reaction data
 */
export async function fetchReactionsForContent(
  contentIds: string[],
  currentUserPubkey?: string
): Promise<Record<string, { likes: number; userVote: 'up' | 'down' | null }>> {
  if (contentIds.length === 0) {
    return {};
  }

  console.log(`Fetching reactions for ${contentIds.length} content items`);

  // Create filter to get all reactions for these content IDs
  const filters: Filter[] = [
    {
      kinds: [7], // kind 7 = reaction
      '#e': contentIds, // Filter by content IDs
      limit: 1000
    }
  ];

  // Fetch reaction events from Nostr relays
  const events = await nostrService.getEvents(filters);
  console.log(`Found ${events.length} reaction events for ${contentIds.length} content items`);
  
  // Debug: Log the first few events
  if (events.length > 0) {
    console.log('Sample reaction events:', events.slice(0, 3).map(e => ({
      id: e.id,
      pubkey: e.pubkey.substring(0, 8) + '...',
      content: e.content,
      tags: e.tags
    })));
  }

  // Process events to count reactions for each content ID
  const reactionsByContent: Record<string, { 
    upvotes: number; 
    downvotes: number; 
    userVote: 'up' | 'down' | null 
  }> = {};

  // Initialize reaction counts for all content IDs
  contentIds.forEach(id => {
    reactionsByContent[id] = { upvotes: 0, downvotes: 0, userVote: null };
  });

  // Count reactions
  for (const event of events) {
    try {
      // Find the content ID this reaction is for
      const contentTag = event.tags.find(tag => tag[0] === 'e');
      if (!contentTag || !contentTag[1]) continue;

      const contentId = contentTag[1];
      if (!reactionsByContent[contentId]) continue;

      // Check the reaction content
      const isUpvote = event.content === '+';
      const isDownvote = event.content === '-';

      if (isUpvote) {
        reactionsByContent[contentId].upvotes += 1;
      } else if (isDownvote) {
        reactionsByContent[contentId].downvotes += 1;
      }

      // Check if this is the current user's vote
      if (currentUserPubkey && event.pubkey === currentUserPubkey) {
        if (isUpvote) {
          reactionsByContent[contentId].userVote = 'up';
          console.log(`Found user vote for ${contentId}: UP from ${event.pubkey.substring(0, 8)}`);
        } else if (isDownvote) {
          reactionsByContent[contentId].userVote = 'down';
          console.log(`Found user vote for ${contentId}: DOWN from ${event.pubkey.substring(0, 8)}`);
        }
      }
    } catch (error) {
      console.error(`Error processing reaction event ${event.id}:`, error);
      // Skip this event and continue with the next one
    }
  }

  // Calculate net likes and format the result
  const result: Record<string, { likes: number; userVote: 'up' | 'down' | null }> = {};
  
  for (const [contentId, data] of Object.entries(reactionsByContent)) {
    result[contentId] = {
      likes: data.upvotes - data.downvotes,
      userVote: data.userVote
    };
    
    if (data.userVote) {
      console.log(`Final user vote for ${contentId}: ${data.userVote}, likes: ${data.upvotes - data.downvotes}`);
    }
  }

  console.log(`Returning reaction data for ${Object.keys(result).length} content items`);
  return result;
}