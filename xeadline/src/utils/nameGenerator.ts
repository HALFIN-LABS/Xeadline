/**
 * Utility functions for generating human-readable names from public keys
 */

// Lists of adjectives and nouns to create readable names
const adjectives = [
  'Amber',
  'Azure',
  'Bold',
  'Brave',
  'Bright',
  'Calm',
  'Clever',
  'Cosmic',
  'Crisp',
  'Daring',
  'Deep',
  'Eager',
  'Elated',
  'Fierce',
  'Fresh',
  'Gentle',
  'Grand',
  'Happy',
  'Honest',
  'Humble',
  'Jolly',
  'Keen',
  'Kind',
  'Lively',
  'Lucky',
  'Merry',
  'Mighty',
  'Noble',
  'Polite',
  'Proud',
  'Quick',
  'Quiet',
  'Rapid',
  'Royal',
  'Sharp',
  'Silent',
  'Smart',
  'Smooth',
  'Swift',
  'Trusty',
  'Vivid',
  'Witty',
  'Zesty',
  'Agile',
  'Brave',
  'Broad',
  'Tasty',
  'Wise'
]

const nouns = [
  'Anchor',
  'Arrow',
  'Beacon',
  'Breeze',
  'Brook',
  'Cipher',
  'Comet',
  'Coral',
  'Crystal',
  'Dune',
  'Echo',
  'Ember',
  'Falcon',
  'Fern',
  'Flame',
  'Galaxy',
  'Glacier',
  'Harbor',
  'Horizon',
  'Island',
  'Jasper',
  'Lagoon',
  'Lantern',
  'Maple',
  'Meadow',
  'Nebula',
  'Ocean',
  'Orbit',
  'Pebble',
  'Phoenix',
  'Planet',
  'Prism',
  'Quasar',
  'Reef',
  'River',
  'Sapphire',
  'Shadow',
  'Spark',
  'Summit',
  'Thunder',
  'Tiger',
  'Titan',
  'Venture',
  'Voyage',
  'Whisper',
  'Willow',
  'Zenith',
  'Citron'
]

/**
 * Generates a deterministic display name from a public key
 * 
 * @param publicKey - The Nostr public key
 * @returns A human-readable display name
 */
export function generateDisplayName(publicKey: string): string {
  if (!publicKey || publicKey.length < 8) {
    return 'Anonymous User'
  }
  
  // Use parts of the public key to deterministically select words
  const adjIndex = parseInt(publicKey.substring(0, 4), 16) % adjectives.length
  const nounIndex = parseInt(publicKey.substring(4, 8), 16) % nouns.length
  
  const adjective = adjectives[adjIndex]
  const noun = nouns[nounIndex]
  
  return `${adjective} ${noun}`
}

/**
 * Generates a short identifier from a public key
 * 
 * @param publicKey - The Nostr public key
 * @returns A shortened version of the public key
 */
export function shortenPublicKey(publicKey: string): string {
  if (!publicKey || publicKey.length < 16) {
    return publicKey || ''
  }
  
  return `${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 8)}`
}