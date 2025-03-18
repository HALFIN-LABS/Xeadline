# IPFS Integration Research for Xeadline

## Overview

This document outlines research findings and recommendations for integrating the InterPlanetary File System (IPFS) into Xeadline as a distributed storage solution. IPFS integration aligns with Xeadline's decentralized architecture and can provide significant benefits for content persistence and availability.

## What is IPFS?

The InterPlanetary File System (IPFS) is a protocol and peer-to-peer network for storing and sharing data in a distributed file system. IPFS uses content-addressing to uniquely identify each file in a global namespace connecting all computing devices.

Key characteristics of IPFS:

- **Content-addressed storage**: Files are identified by their content (cryptographic hash) rather than location
- **Decentralized**: No central point of failure
- **Deduplication**: Identical files are stored only once on the network
- **Peer-to-peer**: Direct file transfers between nodes without intermediaries
- **Versioning**: Support for tracking file history and changes
- **Resilience**: Content can be retrieved from multiple sources

## Benefits for Xeadline

Integrating IPFS with Xeadline offers several advantages:

1. **Censorship resistance**: Content stored on IPFS is harder to censor or remove
2. **Reduced bandwidth costs**: Content can be served from nearby peers
3. **Improved availability**: Files remain accessible even if the original uploader goes offline
4. **Content persistence**: With proper pinning, content can be permanently available
5. **Alignment with decentralized principles**: Complements Xeadline's use of Nostr and Lightning
6. **Reduced reliance on centralized storage**: Less dependency on Vercel Blob and Supabase storage

## IPFS Pinning Services

While IPFS provides distributed storage, nodes can garbage-collect content that isn't "pinned" (marked for persistence). Pinning services ensure content remains available by keeping it pinned on dedicated IPFS nodes.

### Comparison of Popular IPFS Pinning Services

| Service | Free Tier | Pricing | API | Features | Notes |
|---------|-----------|---------|-----|----------|-------|
| [Pinata](https://pinata.cloud/) | 1GB | $0.15/GB/month | REST API, JS SDK | Dedicated gateways, IPFS CID v0/v1 support, metadata | Most developer-friendly, good documentation |
| [Web3.Storage](https://web3.storage/) | 5GB | Free for public data | REST API, JS client | Filecoin integration, content retrieval API | Backed by Protocol Labs |
| [Filebase](https://filebase.com/) | No | $0.15/GB/month | S3-compatible | Multi-cloud redundancy, S3 compatibility | Easy migration from S3 |
| [Infura](https://infura.io/) | 5GB | Custom pricing | REST API | Ethereum integration, dedicated gateways | Good for projects also using Ethereum |
| [NFT.Storage](https://nft.storage/) | Unlimited | Free for NFT data | REST API, JS client | Optimized for NFT metadata and assets | Backed by Protocol Labs |
| [Scaleway](https://www.scaleway.com/) | No | €0.01/GB/month + €0.01/GB transfer | S3-compatible | European hosting, GDPR compliance | Good for EU-based projects |

### Recommended Pinning Service for Xeadline

Based on the comparison, **Pinata** or **Web3.Storage** would be the most suitable options for Xeadline:

- **Pinata** offers the most developer-friendly experience with comprehensive documentation and a JavaScript SDK
- **Web3.Storage** provides a generous free tier and is backed by Protocol Labs (the creators of IPFS)

## Implementation Options

### JavaScript Libraries for IPFS Integration

1. **Helia** (Recommended)
   - Modern TypeScript implementation of IPFS for browsers and Node.js
   - Lightweight and modular
   - Maintained by Protocol Labs
   - GitHub: https://github.com/ipfs/helia

2. **js-ipfs**
   - Full implementation of IPFS in JavaScript
   - More mature but heavier than Helia
   - GitHub: https://github.com/ipfs/js-ipfs

3. **ipfs-http-client**
   - Lightweight client library that connects to an IPFS daemon
   - Good for applications that don't need to run a full IPFS node
   - GitHub: https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client

### Integration with Pinning Services

Most pinning services provide REST APIs and JavaScript SDKs:

1. **Pinata SDK**
   ```bash
   npm install @pinata/sdk
   ```

2. **Web3.Storage Client**
   ```bash
   npm install web3.storage
   ```

## Recommended Implementation Approach

### 1. Architecture

We recommend a hybrid approach:

1. **Client-side IPFS integration** using Helia for browser-based file handling
2. **Server-side pinning service integration** to ensure persistence of important content
3. **Fallback to current storage solutions** (Vercel Blob/Supabase) when IPFS is not available

### 2. Implementation Steps

#### Phase 1: Basic IPFS Integration

1. Create an IPFS service module that abstracts IPFS operations:

```typescript
// src/services/ipfsService.ts
import { createHelia } from 'helia'
import { strings } from '@helia/strings'
import { json } from '@helia/json'
import { unixfs } from '@helia/unixfs'

export class IPFSService {
  private helia: any
  private stringEncoder: any
  private jsonEncoder: any
  private fs: any
  
  constructor() {
    this.initialize()
  }
  
  async initialize() {
    try {
      this.helia = await createHelia()
      this.stringEncoder = strings(this.helia)
      this.jsonEncoder = json(this.helia)
      this.fs = unixfs(this.helia)
      console.log('IPFS node initialized')
    } catch (error) {
      console.error('Failed to initialize IPFS node:', error)
    }
  }
  
  async addString(content: string): Promise<string> {
    try {
      const cid = await this.stringEncoder.add(content)
      return cid.toString()
    } catch (error) {
      console.error('Error adding string to IPFS:', error)
      throw error
    }
  }
  
  async getString(cid: string): Promise<string> {
    try {
      return await this.stringEncoder.get(cid)
    } catch (error) {
      console.error('Error getting string from IPFS:', error)
      throw error
    }
  }
  
  async addJSON(json: any): Promise<string> {
    try {
      const cid = await this.jsonEncoder.add(json)
      return cid.toString()
    } catch (error) {
      console.error('Error adding JSON to IPFS:', error)
      throw error
    }
  }
  
  async getJSON(cid: string): Promise<any> {
    try {
      return await this.jsonEncoder.get(cid)
    } catch (error) {
      console.error('Error getting JSON from IPFS:', error)
      throw error
    }
  }
  
  async addFile(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer()
      const cid = await this.fs.addBytes(new Uint8Array(buffer))
      return cid.toString()
    } catch (error) {
      console.error('Error adding file to IPFS:', error)
      throw error
    }
  }
}

// Create singleton instance
const ipfsService = new IPFSService()
export default ipfsService
```

2. Create a pinning service integration:

```typescript
// src/services/pinningService.ts
import axios from 'axios'

export interface PinningServiceConfig {
  apiKey: string
  apiSecret?: string
  endpoint: string
}

export class PinningService {
  private config: PinningServiceConfig
  
  constructor(config: PinningServiceConfig) {
    this.config = config
  }
  
  async pinCID(cid: string, name?: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.config.endpoint}/pinning/pinByHash`,
        {
          hashToPin: cid,
          name: name || `xeadline-${Date.now()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      )
      
      return response.status === 200
    } catch (error) {
      console.error('Error pinning CID:', error)
      return false
    }
  }
  
  async unpinCID(cid: string): Promise<boolean> {
    try {
      const response = await axios.delete(
        `${this.config.endpoint}/pinning/unpin/${cid}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      )
      
      return response.status === 200
    } catch (error) {
      console.error('Error unpinning CID:', error)
      return false
    }
  }
  
  async listPinned(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.config.endpoint}/pinning/pinList`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      )
      
      return response.data.rows || []
    } catch (error) {
      console.error('Error listing pinned content:', error)
      return []
    }
  }
}
```

3. Create a server-side API endpoint for pinning:

```typescript
// src/pages/api/ipfs/pin.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { PinningService } from '../../../services/pinningService'

// Initialize pinning service with environment variables
const pinningService = new PinningService({
  apiKey: process.env.PINATA_API_KEY || '',
  apiSecret: process.env.PINATA_API_SECRET || '',
  endpoint: 'https://api.pinata.cloud'
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { cid, name } = req.body
    
    if (!cid) {
      return res.status(400).json({ error: 'CID is required' })
    }
    
    const success = await pinningService.pinCID(cid, name)
    
    if (success) {
      return res.status(200).json({ success: true, cid })
    } else {
      return res.status(500).json({ error: 'Failed to pin content' })
    }
  } catch (error) {
    console.error('Error in pin API:', error)
    return res.status(500).json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
```

#### Phase 2: Integration with Existing Upload Functionality

4. Modify the blob.ts file to support IPFS uploads:

```typescript
// src/lib/blob.ts (modified)
import ipfsService from '../services/ipfsService'

/**
 * Uploads a file to IPFS and optionally to Vercel Blob as fallback
 * @param file The file to upload
 * @param imageType The type of image (icon or banner)
 * @param topicId Optional topic ID
 * @param useIPFS Whether to use IPFS (defaults to true)
 * @returns The URL or IPFS URI of the uploaded file
 */
export async function uploadToStorage(
  file: File,
  imageType: 'icon' | 'banner',
  topicId?: string,
  useIPFS: boolean = true
): Promise<string> {
  try {
    // Validate file as before...
    
    if (useIPFS) {
      try {
        console.log('Attempting IPFS upload...')
        
        // Upload to IPFS
        const cid = await ipfsService.addFile(file)
        console.log('File uploaded to IPFS with CID:', cid)
        
        // Pin the content via API
        const pinResponse = await fetch('/api/ipfs/pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cid,
            name: `${imageType}${topicId ? `-${topicId}` : ''}`
          })
        })
        
        if (pinResponse.ok) {
          console.log('Content pinned successfully')
          
          // Return IPFS gateway URL
          return `https://gateway.pinata.cloud/ipfs/${cid}`
        } else {
          console.warn('Failed to pin content, but IPFS upload succeeded')
          // Still return the IPFS URL even if pinning failed
          return `https://ipfs.io/ipfs/${cid}`
        }
      } catch (ipfsError) {
        console.error('IPFS upload failed, falling back to Blob storage:', ipfsError)
        // Fall through to Blob storage
      }
    }
    
    // Fallback to original Vercel Blob upload logic...
    console.log('Using Vercel Blob storage fallback')
    
    // Original Blob upload code...
    
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}
```

5. Update the profile image upload function:

```typescript
// src/services/profileService.ts (modified)
import { uploadToStorage } from '../lib/blob'

/**
 * Uploads an image to IPFS (with fallback to Vercel Blob) and returns the URL
 * @param file The image file to upload
 * @returns Promise resolving to the image URL
 */
export async function uploadProfileImage(file: File): Promise<string> {
  try {
    // Upload the image to IPFS with Vercel Blob fallback
    const imageUrl = await uploadToStorage(file, 'icon')
    return imageUrl
  } catch (error) {
    console.error('Error uploading profile image:', error)
    
    // Fallback to a placeholder image if upload fails
    if (process.env.NODE_ENV === 'development') {
      return `https://robohash.org/${Date.now()}?set=set3&size=200x200`
    }
    throw error
  }
}
```

#### Phase 3: Advanced Features

6. Add IPFS content resolution and gateway selection:

```typescript
// src/utils/ipfsUtils.ts
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
]

/**
 * Converts an IPFS CID to a gateway URL
 * @param cid The IPFS CID
 * @param preferredGateway Optional preferred gateway
 * @returns Gateway URL
 */
export function cidToUrl(cid: string, preferredGateway?: string): string {
  // Remove ipfs:// prefix if present
  const cleanCid = cid.replace('ipfs://', '')
  
  // Use preferred gateway if specified, otherwise use the first one
  const gateway = preferredGateway || IPFS_GATEWAYS[0]
  
  return `${gateway}${cleanCid}`
}

/**
 * Extracts CID from an IPFS URL or URI
 * @param url IPFS URL or URI
 * @returns The CID or null if not an IPFS URL
 */
export function extractCid(url: string): string | null {
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '')
  }
  
  // Handle gateway URLs
  for (const gateway of IPFS_GATEWAYS) {
    if (url.startsWith(gateway)) {
      return url.replace(gateway, '')
    }
  }
  
  // Handle /ipfs/ path format
  const ipfsPathMatch = url.match(/\/ipfs\/([^/?#]+)/)
  if (ipfsPathMatch && ipfsPathMatch[1]) {
    return ipfsPathMatch[1]
  }
  
  return null
}

/**
 * Checks if a URL is an IPFS URL
 * @param url URL to check
 * @returns Boolean indicating if it's an IPFS URL
 */
export function isIpfsUrl(url: string): boolean {
  return extractCid(url) !== null
}
```

7. Add a component for displaying IPFS content with fallback:

```tsx
// src/components/common/IpfsImage.tsx
import { useState, useEffect } from 'react'
import { isIpfsUrl, cidToUrl, extractCid } from '../../utils/ipfsUtils'

interface IpfsImageProps {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
  width?: number
  height?: number
}

export default function IpfsImage({
  src,
  alt,
  className,
  fallbackSrc,
  width,
  height
}: IpfsImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src)
  const [gatewayIndex, setGatewayIndex] = useState<number>(0)
  const [error, setError] = useState<boolean>(false)
  
  useEffect(() => {
    setCurrentSrc(src)
    setError(false)
    setGatewayIndex(0)
  }, [src])
  
  const handleError = () => {
    if (isIpfsUrl(src)) {
      const cid = extractCid(src)
      if (cid) {
        // Try the next gateway
        const GATEWAYS = [
          'https://gateway.pinata.cloud/ipfs/',
          'https://ipfs.io/ipfs/',
          'https://cloudflare-ipfs.com/ipfs/',
          'https://gateway.ipfs.io/ipfs/'
        ]
        
        const nextIndex = (gatewayIndex + 1) % GATEWAYS.length
        setGatewayIndex(nextIndex)
        setCurrentSrc(`${GATEWAYS[nextIndex]}${cid}`)
        return
      }
    }
    
    // If not an IPFS URL or we've tried all gateways, use fallback
    setError(true)
    if (fallbackSrc) {
      setCurrentSrc(fallbackSrc)
    }
  }
  
  return (
    <img
      src={error && fallbackSrc ? fallbackSrc : currentSrc}
      alt={alt}
      className={`${className} ${error ? 'ipfs-image-error' : ''}`}
      onError={handleError}
      width={width}
      height={height}
    />
  )
}
```

## Considerations and Challenges

### 1. Performance

- IPFS content resolution can be slower than centralized storage
- Consider using service workers for caching IPFS content
- Implement progressive loading and placeholders

### 2. Gateway Reliability

- Public IPFS gateways can be unreliable
- Implement gateway fallbacks as shown in the IpfsImage component
- Consider using a dedicated gateway service for production

### 3. Content Moderation

- Content on IPFS cannot be easily removed once published
- Implement client-side filtering for inappropriate content
- Store content references (CIDs) in a database to maintain control over what's displayed

### 4. User Experience

- Provide clear feedback during IPFS uploads (which may be slower)
- Implement fallbacks to traditional storage when IPFS is unavailable
- Consider progressive enhancement approach

## Conclusion and Next Steps

Integrating IPFS into Xeadline is a significant step toward a more decentralized architecture. The hybrid approach outlined above balances the benefits of IPFS with practical considerations for reliability and user experience.

### Recommended Next Steps:

1. **Proof of Concept**: Implement a basic IPFS integration for profile images
2. **Performance Testing**: Measure and optimize IPFS content loading times
3. **Pinning Strategy**: Develop a strategy for what content should be pinned and for how long
4. **Gateway Selection**: Evaluate and select reliable IPFS gateways or consider running a dedicated gateway
5. **Progressive Rollout**: Gradually expand IPFS usage to other content types

By following this implementation plan, Xeadline can leverage the benefits of IPFS while maintaining a smooth user experience.