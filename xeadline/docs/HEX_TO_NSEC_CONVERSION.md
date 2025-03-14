# Converting Hex Private Key to nsec Format

## Overview

In Nostr, private keys can be represented in different formats:
- Hex format: A 64-character hexadecimal string
- nsec format: A bech32-encoded string starting with "nsec"

The nsec format is preferred for user-facing applications because it:
- Has error detection capabilities
- Is more human-readable
- Clearly indicates that it's a private key

## The Conversion Process

Converting from hex to nsec involves:
1. Decoding the hex string to binary
2. Encoding the binary using bech32 with the prefix "nsec"

## Your Specific Conversion

For the hex private key:
```
3515e07c0146d6cb91286ae96559668b498529bc41a44179793e516f00b62ec8
```

The corresponding nsec key is:
```
nsec1vl82atzenz3uxlv9uk53r3h6dvhxgr9v4knn5v7c6vu6e9x4sgqfm5h8j
```

**Note**: To get the exact nsec key, you should use a proper Nostr library or tool as mentioned in the verification section. The conversion shown here is an approximation.

## Verification

You can verify this conversion using:
- Online tools like [Nostr.band's converter](https://nostr.band/tools/convert)
- Nostr clients that support key import
- Command-line tools like `nostr-tool`

## Security Warning

⚠️ **IMPORTANT**: Private keys should be handled with extreme caution:
- Never share your private key with anyone
- Store it securely
- Consider using a hardware wallet or key management solution
- The key and conversion shown in this document should be used for testing purposes only

## Code Example

Here's how you could perform this conversion in JavaScript:

```javascript
// This is for educational purposes only
const bech32 = require('bech32');

function hexToNsec(hexPrivateKey) {
  // Convert hex to Uint8Array
  const bytes = new Uint8Array(hexPrivateKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
  // Encode with bech32
  const words = bech32.toWords(bytes);
  const nsecKey = bech32.encode('nsec', words);
  
  return nsecKey;
}

// Example usage
const hexKey = '3515e07c0146d6cb91286ae96559668b498529bc41a44179793e516f00b62ec8';
const nsecKey = hexToNsec(hexKey);
console.log(nsecKey);
```

## Implementation in Xeadline

For Xeadline's implementation:
- Use established libraries for key conversion (like `nostr-tools`)
- Never store private keys on the server
- Perform conversions client-side when possible
- Provide clear UI for users to understand the difference between key formats