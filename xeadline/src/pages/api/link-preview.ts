import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route for fetching Open Graph metadata from a URL
 * 
 * This is a simplified implementation that demonstrates how to fetch
 * and parse Open Graph metadata from a URL. In a production environment,
 * you would want to add caching, error handling, and security measures.
 * 
 * @param req - The request object
 * @param res - The response object
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the URL from the query parameters
  const { url } = req.query;
  
  // Validate the URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // Fetch the HTML from the URL
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse the HTML to extract Open Graph metadata
    const ogData = extractOpenGraphData(html, url);
    
    // Return the Open Graph metadata
    return res.status(200).json(ogData);
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return res.status(500).json({ error: 'Failed to fetch link preview' });
  }
}

/**
 * Extract Open Graph metadata from HTML
 * 
 * @param html - The HTML to parse
 * @param url - The URL of the page
 * @returns The Open Graph metadata
 */
function extractOpenGraphData(html: string, url: string) {
  // Create a simple object to store the Open Graph metadata
  const ogData: Record<string, string> = {
    url,
  };
  
  // Extract the Open Graph metadata using regular expressions
  // In a production environment, you would use a proper HTML parser
  const ogTags = html.match(/<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi);
  
  if (ogTags) {
    ogTags.forEach((tag) => {
      const match = tag.match(/property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/i);
      if (match) {
        const [, property, content] = match;
        ogData[property] = content;
      }
    });
  }
  
  // Extract the title if not found in Open Graph metadata
  if (!ogData.title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      ogData.title = titleMatch[1];
    }
  }
  
  // Extract the description if not found in Open Graph metadata
  if (!ogData.description) {
    const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']\s*\/?>/i);
    if (descriptionMatch) {
      ogData.description = descriptionMatch[1];
    }
  }
  
  // Extract Twitter Card metadata as a fallback
  const twitterTags = html.match(/<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi);
  
  if (twitterTags) {
    twitterTags.forEach((tag) => {
      const match = tag.match(/name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']/i);
      if (match) {
        const [, property, content] = match;
        // Only use Twitter Card metadata if the property doesn't exist in Open Graph
        if (!ogData[property]) {
          ogData[property] = content;
        }
      }
    });
  }
  
  // Extract the domain from the URL
  try {
    const urlObj = new URL(url);
    ogData.siteName = ogData.siteName || urlObj.hostname;
  } catch (error) {
    // Ignore URL parsing errors
  }
  
  return ogData;
}