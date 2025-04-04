/**
 * Utility functions for handling markdown content
 */

// Regular expressions for markdown syntax
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;
const ITALIC_REGEX = /\*([^*]+)\*/g;

/**
 * Parse markdown links in text
 * @param text The text containing markdown links
 * @param makeLinksClickable Whether to make links clickable or just show the text
 * @returns Processed text with links either as HTML or just the link text
 */
export const parseMarkdownLinks = (text: string, makeLinksClickable: boolean = false): string => {
  if (!text) return '';
  
  if (makeLinksClickable) {
    // Replace markdown links with HTML links
    return text.replace(LINK_REGEX, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
  } else {
    // Replace markdown links with just the text
    return text.replace(LINK_REGEX, '$1');
  }
};

/**
 * Parse bold markdown in text
 * @param text The text containing bold markdown
 * @returns Processed text with bold markdown converted to HTML
 */
export const parseBold = (text: string): string => {
  if (!text) return '';
  return text.replace(BOLD_REGEX, '<strong>$1</strong>');
};

/**
 * Parse italic markdown in text
 * @param text The text containing italic markdown
 * @returns Processed text with italic markdown converted to HTML
 */
export const parseItalic = (text: string): string => {
  if (!text) return '';
  return text.replace(ITALIC_REGEX, '<em>$1</em>');
};

/**
 * Extract the first URL from a markdown text
 * @param text The markdown text to extract URL from
 * @returns The first URL found or null if none
 */
export const extractFirstUrl = (text: string): string | null => {
  if (!text) return null;
  
  // Try to find a markdown link first
  const markdownMatch = text.match(LINK_REGEX);
  if (markdownMatch) {
    const urlMatch = markdownMatch[0].match(/\]\((.*?)\)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
  }
  
  // If no markdown link, try to find a raw URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const rawMatch = text.match(urlRegex);
  if (rawMatch) {
    return rawMatch[0];
  }
  
  return null;
};

/**
 * Parse all markdown in text
 * @param text The markdown text to parse
 * @param options Options for parsing
 * @returns Processed text with markdown converted based on options
 */
export const parseMarkdown = (
  text: string,
  options: {
    makeLinksClickable?: boolean
  } = {}
): string => {
  if (!text) return '';
  
  const { makeLinksClickable = false } = options;
  
  // Process links first
  let processedText = parseMarkdownLinks(text, makeLinksClickable);
  
  // Always process bold and italic formatting
  processedText = parseBold(processedText);
  processedText = parseItalic(processedText);
  
  return processedText;
};