'use client'

import React, { useState } from 'react'
import { TextArea } from '../ui/TextArea'

interface RichTextEditorProps {
  onChange: (text: string) => void
  placeholder?: string
  initialContent?: string
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onChange,
  placeholder = 'Write something...',
  initialContent = ''
}) => {
  const [content, setContent] = useState(initialContent)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    onChange(newContent)
  }

  return (
    <div className="rich-text-editor border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
      <div className="editor-toolbar border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 flex items-center space-x-2">
        {/* Simple toolbar for Phase 1 - will be enhanced in Phase 2 */}
        <button 
          type="button" 
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Bold"
        >
          <span className="font-bold">B</span>
        </button>
        <button 
          type="button" 
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Italic"
        >
          <span className="italic">I</span>
        </button>
        <button 
          type="button" 
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Link"
        >
          <span className="underline">Link</span>
        </button>
      </div>
      <TextArea
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-none focus:ring-0 min-h-[150px] p-3"
      />
    </div>
  )
}