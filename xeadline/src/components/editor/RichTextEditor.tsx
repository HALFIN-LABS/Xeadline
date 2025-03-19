'use client'

import React, { useState, useRef } from 'react'
import { TextArea } from '../ui/TextArea'
import { Input } from '../ui/Input'

interface RichTextEditorProps {
  onChange: (text: string) => void
  placeholder?: string
  initialContent?: string
  className?: string
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onChange,
  placeholder = 'Write something...',
  initialContent = '',
  className = ''
}) => {
  const [content, setContent] = useState(initialContent)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    onChange(newContent)
  }

  // Apply basic formatting functions
  // Helper function to apply formatting
  const applyFormatting = (formatFn: (text: string) => string, defaultText: string) => {
    if (!textareaRef.current) return;
    
    // Get the selected text
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = textareaRef.current.value.substring(start, end);
    
    // Apply formatting
    const textToFormat = selectedText || defaultText;
    const formattedText = formatFn(textToFormat);
    
    // Insert the formatted text
    const newContent =
      textareaRef.current.value.substring(0, start) +
      formattedText +
      textareaRef.current.value.substring(end);
    
    // Update the content
    setContent(newContent);
    onChange(newContent);
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }
    }, 0);
  };

  const applyBold = () => {
    applyFormatting(
      (text) => `**${text}**`,
      'Bold text'
    );
  };

  const applyItalic = () => {
    applyFormatting(
      (text) => `*${text}*`,
      'Italic text'
    );
  };

  const applyLink = () => {
    // Save current selection
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      setSelectionRange({ start, end });
    }
    
    // Show link input
    setShowLinkInput(true);
  };
  
  const insertLink = () => {
    if (!selectionRange || !textareaRef.current) return;
    
    const { start, end } = selectionRange;
    const selectedText = textareaRef.current.value.substring(start, end);
    
    // Create the link format
    const linkText = selectedText || 'Link text';
    const formattedText = `[${linkText}](${linkUrl})`;
    
    // Insert the link
    const newContent =
      textareaRef.current.value.substring(0, start) +
      formattedText +
      textareaRef.current.value.substring(end);
    
    // Update the content
    setContent(newContent);
    onChange(newContent);
    
    // Reset link input
    setShowLinkInput(false);
    setLinkUrl('https://');
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }
    }, 0);
  };
  
  const cancelLinkInput = () => {
    setShowLinkInput(false);
    setLinkUrl('https://');
  };

  return (
    <div className={`rich-text-editor border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden relative z-10 w-full ${className}`}>
      <div className="editor-toolbar border-b border-gray-300 dark:border-gray-700 p-2 flex items-center space-x-2 w-full">
        {/* Simple toolbar for Phase 1 - will be enhanced in Phase 2 */}
        <button
          type="button"
          className="p-1 rounded hover:bg-black/20"
          title="Bold"
          onClick={applyBold}
        >
          <span className="font-bold">B</span>
        </button>
        <button
          type="button"
          className="p-1 rounded hover:bg-black/20"
          title="Italic"
          onClick={applyItalic}
        >
          <span className="italic">I</span>
        </button>
        <button
          type="button"
          className="p-1 rounded hover:bg-black/20"
          title="Link"
          onClick={applyLink}
        >
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </span>
        </button>
      </div>
      {showLinkInput && (
        <div className="p-3 border-b border-gray-300 dark:border-gray-700 bg-black/40 flex items-center space-x-2">
          <Input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL"
            className="flex-1 bg-transparent text-white border-gray-700/30"
            style={{ backgroundColor: 'transparent' }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                insertLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelLinkInput();
              }
            }}
          />
          <button
            type="button"
            className="px-3 py-1 bg-bottle-green text-white rounded-md hover:bg-bottle-green/90"
            onClick={insertLink}
          >
            Add
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            onClick={cancelLinkInput}
          >
            Cancel
          </button>
        </div>
      )}
      <TextArea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-none focus:ring-0 min-h-[150px] p-3 bg-transparent text-white w-full"
        style={{ backgroundColor: 'transparent', width: '100%' }}
      />
    </div>
  )
}