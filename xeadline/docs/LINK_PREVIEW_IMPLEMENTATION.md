
# Link Preview Implementation

This document explains how link previews are implemented in Xeadline.

## Overview

Link previews provide a rich visual representation of URLs shared in posts. They typically include:

- A title
- A description
- An image
- The domain/site name

These previews enhance the user experience by giving context about links without requiring users to click on them.

## Implementation

### Client-Side Component

The `LinkPreview` component (`src/components/common/LinkPreview.tsx`) is responsible for rendering link previews. It:

1. Takes a URL as input
2. Extracts the domain from the URL
3. Makes a request to AllOrigins to fetch the HTML content of the URL
4. Parses the HTML to extract Open Graph and Twitter Card metadata
5. Renders a preview card with the metadata or falls back to domain-specific placeholders
### Client-Side Implementation with CORS Proxy

Our implementation uses [AllOrigins](https://github.com/gnuns/allorigins), a CORS proxy that allows client-side JavaScript to request content from any website:

1. The client makes a request to AllOrigins with the target URL
2. AllOrigins fetches the HTML content and returns it with appropriate CORS headers
3. The client parses the HTML to extract Open Graph and Twitter Card metadata
4. The metadata is used to render the link preview

This approach eliminates the need for a server-side API, making the implementation simpler and reducing server load. When errors occur, we fall back to domain-specific placeholders to ensure a consistent user experience.
Note: We initially explored using [AllOrigins](https://github.com/gnuns/allorigins) as a CORS proxy but encountered reliability issues. A server-side implementation would be more robust for production use.

### Fallback Server-Side API (Optional)

For production environments with high traffic or specific requirements, a server-side API can be implemented as a fallback:

```typescript
// Example API route in Next.js
// src/pages/api/link-preview.ts
export default async function handler(req, res) {
  const { url } = req.query;
  // Fetch and parse HTML, then return metadata
}
```

### Metadata Standards

We support two main metadata standards:

1. **Open Graph Protocol (OG)**: Developed by Facebook, this is the most widely used standard for link previews. Websites define metadata using `<meta property="og:X">` tags.

2. **Twitter Cards**: Similar to Open Graph but specific to Twitter. Websites define metadata using `<meta name="twitter:X">` tags.

Example Open Graph tags:
```html
<meta property="og:title" content="Article Title">
<meta property="og:description" content="Article description">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com/article">
<meta property="og:site_name" content="Example Site">
```

### Current Implementation Status

The current implementation:

1. Uses AllOrigins to fetch HTML content and extract Open Graph metadata
2. Provides visually distinct fallbacks based on domain name when metadata is unavailable
3. Features a compact design that fits well in the post card layout
4. Aligns with the bottom of the post content for a clean layout
5. Limits preview text to two lines for consistent card heights
6. Handles network errors gracefully with domain-based fallbacks

In a production environment, this would be enhanced with:

1. A dedicated server-side API endpoint to fetch and parse HTML content
2. Proper caching to avoid repeated requests for the same URL
3. Security measures to prevent abuse
4. More robust HTML parsing (using a proper HTML parser instead of regex)
5. Image optimization and proxying
6. More sophisticated error handling and rate limiting

## Future Improvements

Potential improvements include:

1. **Caching**: Implement Redis or another caching solution to store metadata for frequently shared URLs
2. **Image Proxy**: Proxy images through our server to optimize size and prevent tracking
3. **Fallback Scraping**: For sites without OG tags, implement custom scraping logic
4. **Preview Customization**: Allow users to customize how their links appear
5. **Analytics**: Track which links receive the most engagement

## References

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)