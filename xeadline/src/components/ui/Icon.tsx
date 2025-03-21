'use client'

import React from 'react'
import {
  FileText,
  Image,
  Link,
  BarChart2,
  Tag,
  MessageCircle,
  Zap,
  Share,
  Video,
  Gift,
  Play,
  Check
} from 'react-feather'

// Define all available icons
type IconName =
  | 'file-text'
  | 'image'
  | 'link'
  | 'bar-chart-2'
  | 'tag'
  | 'message-circle'
  | 'zap'
  | 'share'
  | 'video'
  | 'gift'
  | 'play'
  | 'check'

interface IconProps {
  name: IconName
  size?: number
  color?: string
  className?: string
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = ''
}) => {
  const getIcon = () => {
    switch (name) {
      case 'file-text':
        return <FileText size={size} color={color} />
      case 'image':
        return <Image size={size} color={color} />
      case 'link':
        return <Link size={size} color={color} />
      case 'bar-chart-2':
        return <BarChart2 size={size} color={color} />
      case 'tag':
        return <Tag size={size} color={color} />
      case 'message-circle':
        return <MessageCircle size={size} color={color} />
      case 'zap':
        return <Zap size={size} color={color} />
      case 'share':
        return <Share size={size} color={color} />
      case 'video':
        return <Video size={size} color={color} />
      case 'gift':
        return <Gift size={size} color={color} />
      case 'play':
        return <Play size={size} color={color} />
      case 'check':
        return <Check size={size} color={color} />
      default:
        return null
    }
  }

  return (
    <span className={className}>
      {getIcon()}
    </span>
  )
}