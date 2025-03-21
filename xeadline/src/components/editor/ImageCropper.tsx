'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface ImageCropperProps {
  imageUrl: string
  onCrop: (croppedImageBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
  maxWidth?: number
  darkMode?: boolean
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  onCrop,
  onCancel,
  aspectRatio = 16 / 9, // Default to 16:9
  maxWidth = 1920,
  darkMode = false
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  
  // Initialize crop area when image loads
  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      
      // Calculate initial crop area
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight
        setContainerSize({ width: containerWidth, height: containerHeight })
        
        // Calculate scale to fit image in container
        const scaleX = containerWidth / img.width
        const scaleY = containerHeight / img.height
        const newScale = Math.min(scaleX, scaleY, 1) // Don't scale up
        setScale(newScale)
        
        // Calculate crop area based on aspect ratio
        let cropWidth, cropHeight
        
        if (img.width / img.height > aspectRatio) {
          // Image is wider than target aspect ratio
          cropHeight = img.height
          cropWidth = cropHeight * aspectRatio
        } else {
          // Image is taller than target aspect ratio
          cropWidth = img.width
          cropHeight = cropWidth / aspectRatio
        }
        
        // Center the crop area
        const x = (img.width - cropWidth) / 2
        const y = (img.height - cropHeight) / 2
        
        setCrop({ x, y, width: cropWidth, height: cropHeight })
      }
    }
  }, [imageUrl, aspectRatio])
  
  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageRef.current) return
    
    e.preventDefault()
    setIsDragging(true)
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    
    setDragStart({ x, y })
  }
  
  // Handle mouse move to update crop area
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    
    const deltaX = x - dragStart.x
    const deltaY = y - dragStart.y
    
    // Update crop area
    setCrop(prevCrop => {
      // Calculate new position
      let newX = prevCrop.x + deltaX
      let newY = prevCrop.y + deltaY
      
      // Constrain to image boundaries
      newX = Math.max(0, Math.min(newX, imageSize.width - prevCrop.width))
      newY = Math.max(0, Math.min(newY, imageSize.height - prevCrop.height))
      
      return {
        ...prevCrop,
        x: newX,
        y: newY
      }
    })
    
    setDragStart({ x, y })
  }
  
  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  // Handle crop
  const handleCrop = () => {
    if (!imageRef.current) return
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Set canvas size to crop size (or maxWidth if crop is larger)
    const outputWidth = Math.min(crop.width, maxWidth)
    const outputHeight = (outputWidth / crop.width) * crop.height
    
    canvas.width = outputWidth
    canvas.height = outputHeight
    
    // Draw cropped image to canvas
    ctx?.drawImage(
      imageRef.current,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, outputWidth, outputHeight
    )
    
    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob)
        }
      },
      'image/jpeg',
      0.9 // Quality
    )
  }
  
  return (
    <div className={`image-cropper ${darkMode ? 'text-white' : ''}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Crop Image</h3>
        <p className="text-sm text-gray-500">
          Drag to position the crop area
        </p>
      </div>
      
      <div 
        ref={containerRef}
        className={`relative overflow-hidden border-2 ${darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-lg mb-4`}
        style={{ height: '400px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Image to crop"
          className="absolute"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          draggable={false}
        />
        
        {/* Crop overlay */}
        <div
          className="absolute border-2 border-white shadow-lg"
          style={{
            left: crop.x * scale,
            top: crop.y * scale,
            width: crop.width * scale,
            height: crop.height * scale,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCrop}
        >
          Crop & Save
        </Button>
      </div>
    </div>
  )
}