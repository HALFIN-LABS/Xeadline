'use client'

import React from 'react'

interface MarkdownContentProps {
  content: string
  makeLinksClickable?: boolean
  className?: string
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  makeLinksClickable = false,
  className = ''
}) => {
  // Function to convert markdown to HTML
  const renderMarkdown = (text: string): string => {
    // Replace bold text: **text** -> <strong>text</strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Replace italic text: *text* -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Replace links: [text](url) -> <a href="url">text</a>
    if (makeLinksClickable) {
      html = html.replace(
        /\[(.*?)\]\((.*?)\)/g, 
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>'
      )
      
      // Also make plain URLs clickable
      html = html.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>'
      )
    } else {
      // Just style links without making them clickable
      html = html.replace(
        /\[(.*?)\]\((.*?)\)/g, 
        '<span class="text-blue-600 dark:text-blue-400">$1</span>'
      )
    }
    
    // Replace line breaks with <br>
    html = html.replace(/\n/g, '<br>')
    
    return html
  }
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}