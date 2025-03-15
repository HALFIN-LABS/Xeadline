/**
 * Service for managing topic slugs
 * This service provides methods for creating, retrieving, and validating topic slugs
 */

// Helper function to generate a slug from a topic name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

// Create a new slug mapping
export async function createSlug(slug: string, topicId: string): Promise<{ slug: string; topicId: string } | null> {
  try {
    const response = await fetch('/api/topic/slug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug, topicId }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating slug:', error);
      return null;
    }

    const data = await response.json();
    return {
      slug: data.slug,
      topicId: data.topic_id,
    };
  } catch (error) {
    console.error('Error creating slug:', error);
    return null;
  }
}

// Get a topic ID from a slug
export async function getTopicIdFromSlug(slug: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/topic/slug?slug=${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.topicId;
  } catch (error) {
    console.error('Error getting topic ID from slug:', error);
    return null;
  }
}

// Check if a slug is available
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const topicId = await getTopicIdFromSlug(slug);
  return topicId === null;
}

// Generate a unique slug based on a name
// If the slug is already taken, append a number to make it unique
export async function generateUniqueSlug(name: string): Promise<string> {
  let baseSlug = generateSlug(name);
  
  // If the slug is empty (e.g., if name only contained special characters),
  // use a default slug
  if (!baseSlug) {
    baseSlug = 'topic';
  }
  
  // Check if the base slug is available
  if (await isSlugAvailable(baseSlug)) {
    return baseSlug;
  }
  
  // If not, try appending numbers until we find an available slug
  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;
  
  while (!(await isSlugAvailable(newSlug))) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
    
    // Safety check to prevent infinite loops
    if (counter > 100) {
      // Generate a random string to ensure uniqueness
      const randomStr = Math.random().toString(36).substring(2, 8);
      return `${baseSlug}-${randomStr}`;
    }
  }
  
  return newSlug;
}