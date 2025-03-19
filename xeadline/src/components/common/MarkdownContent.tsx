'use client'

import React from 'react'
import { parseMarkdown } from '../../utils/markdownUtils'

interface MarkdownContentProps {
  content: string
  makeLinksClickable?: boolean
  className?: string
}

/**
 * Component to render markdown content with configurable options
 * 
 * @param content The markdown content to render
 * @param makeLinksClickable Whether links should be clickable (default: false)
 * @param className Additional CSS classes
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  makeLinksClickable = false,
  className = ''
}) => {
  // Parse the markdown content
  const parsedContent = parseMarkdown(content, { makeLinksClickable });
  
  // If links are clickable, we need to use dangerouslySetInnerHTML
  // Otherwise, we can just render the text directly
  if (makeLinksClickable) {
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: parsedContent }}
      />
    );
  }
  
  // For non-clickable links, just render the parsed text
  return (
    <div className={className}>
      {parsedContent}
    </div>
  );
};