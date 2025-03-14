# NIP-05 Implementation Plan for Xeadline

## Overview

This document outlines the plan for implementing NIP-05 verification for Xeadline users, allowing them to claim and verify usernames in the format `username@xeadline.com`. This feature will enhance user experience, provide human-readable identifiers, and increase trust within the platform.

## What is NIP-05?

NIP-05 is a Nostr Implementation Possibility that provides a way to verify that a Nostr public key belongs to a specific internet identifier (similar to an email address). It works by:

1. Having a domain (like xeadline.com) host a well-known JSON file at `/.well-known/nostr.json`
2. This JSON file maps usernames to public keys
3. Clients can verify that a public key belongs to a username@domain by fetching this file and checking the mapping

## Benefits for Xeadline

Implementing NIP-05 verification will provide several benefits:

1. **User-Friendly Identifiers**: Users can have human-readable identifiers instead of cryptic public keys
2. **Trust Enhancement**: Verified identities build trust in the platform
3. **Ecosystem Integration**: Better integration with other Nostr clients that highlight NIP-05 verified accounts
4. **Spam Reduction**: Verified accounts are less likely to be spammers
5. **Brand Building**: Reinforces the Xeadline brand through username@xeadline.com identifiers

## Technical Implementation

### 1. Backend Infrastructure

#### 1.1 Database Schema

Add the following to our existing database schema:

```sql
CREATE TABLE nip05_usernames (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  pubkey VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_username CHECK (username ~* '^[a-z0-9_]+$')
);

CREATE INDEX idx_nip05_usernames_pubkey ON nip05_usernames(pubkey);
CREATE INDEX idx_nip05_usernames_username ON nip05_usernames(username);
```

#### 1.2 API Endpoints

Create the following API endpoints:

1. **GET `/.well-known/nostr.json`**
   - Dynamically generates the NIP-05 JSON file based on database records
   - Accepts an optional `name` query parameter to filter for a specific username

2. **POST `/api/nip05/claim`**
   - Allows authenticated users to claim an available username
   - Requires signature verification to ensure the user owns the pubkey

3. **GET `/api/nip05/check/{username}`**
   - Checks if a username is available
   - Returns availability status and any restrictions

4. **DELETE `/api/nip05/release`**
   - Allows users to release their claimed username

#### 1.3 Implementation of `/.well-known/nostr.json`

```javascript
// Example implementation using Next.js API route
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  
  let query = 'SELECT username, pubkey FROM nip05_usernames';
  let params = [];
  
  if (name) {
    query += ' WHERE username = $1';
    params.push(name);
  }
  
  const users = await db.query(query, params);
  
  const response = {
    names: {},
    relays: {}
  };
  
  users.forEach(user => {
    response.names[user.username] = user.pubkey;
    
    // Optionally include relay information
    if (user.relays && user.relays.length > 0) {
      response.relays[user.pubkey] = user.relays;
    }
  });
  
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=300' // Cache for 5 minutes
    }
  });
}
```

### 2. Frontend Implementation

#### 2.1 Profile Edit Component

Add NIP-05 username selection to the profile edit form:

```jsx
// Add to ProfileEditModal.tsx
const [username, setUsername] = useState('');
const [usernameAvailable, setUsernameAvailable] = useState(false);
const [usernameChecking, setUsernameChecking] = useState(false);
const [usernameError, setUsernameError] = useState('');

const checkUsernameAvailability = async (value) => {
  if (!value || value.length < 3) {
    setUsernameAvailable(false);
    setUsernameError('Username must be at least 3 characters');
    return;
  }
  
  if (!/^[a-z0-9_]+$/.test(value)) {
    setUsernameAvailable(false);
    setUsernameError('Username can only contain letters, numbers, and underscores');
    return;
  }
  
  setUsernameChecking(true);
  try {
    const response = await fetch(`/api/nip05/check/${value}`);
    const data = await response.json();
    setUsernameAvailable(data.available);
    if (!data.available) {
      setUsernameError('Username already taken');
    } else {
      setUsernameError('');
    }
  } catch (error) {
    console.error('Error checking username:', error);
    setUsernameError('Error checking username availability');
  } finally {
    setUsernameChecking(false);
  }
};

// In the form
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">
    NIP-05 Identifier
  </label>
  <div className="flex items-center">
    <input
      type="text"
      value={username}
      onChange={(e) => {
        const value = e.target.value.toLowerCase();
        setUsername(value);
        checkUsernameAvailability(value);
      }}
      className="mr-2 p-2 border rounded"
      placeholder="username"
    />
    <span>@xeadline.com</span>
  </div>
  {usernameChecking && (
    <p className="text-sm mt-1 text-gray-500">Checking availability...</p>
  )}
  {username && !usernameChecking && (
    <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-500' : 'text-red-500'}`}>
      {usernameAvailable 
        ? 'Username available!' 
        : usernameError || 'Username unavailable'}
    </p>
  )}
  <p className="text-xs text-gray-500 mt-1">
    This will be your verified identifier on Nostr. Other clients will display this as {username || 'username'}@xeadline.com
  </p>
</div>
```

#### 2.2 Profile Display Component

Update the profile display to show NIP-05 verification:

```jsx
// Add to ProfileHeader.tsx
const [nip05Verified, setNip05Verified] = useState(false);
const [nip05Username, setNip05Username] = useState('');

useEffect(() => {
  if (profile?.nip05) {
    // Extract username from nip05 identifier
    const parts = profile.nip05.split('@');
    if (parts.length === 2 && parts[1] === 'xeadline.com') {
      setNip05Username(parts[0]);
      setNip05Verified(true);
    }
  }
}, [profile]);

// In the JSX
{nip05Verified && (
  <div className="flex items-center mt-1">
    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-1" />
    <span className="text-sm text-gray-600">
      {nip05Username}@xeadline.com
    </span>
  </div>
)}
```

### 3. Username Management Policies

#### 3.1 Username Format

- Usernames must be 3-30 characters long
- Only lowercase letters, numbers, and underscores allowed
- No consecutive underscores
- Cannot start or end with an underscore

#### 3.2 Reserved Usernames

Maintain a list of reserved usernames that cannot be claimed by regular users:

- Admin, administrator, xeadline, support, help, mod, moderator, t333btc, imtiaan, altify, xlaxk, halfinlabs
- Common brand names and trademarks
- Offensive or inappropriate terms

#### 3.3 Username Disputes

Implement a process for handling username disputes:

1. User submits a dispute claim
2. Admin reviews the claim
3. If valid, the username is released and the original user is notified
4. The username is temporarily reserved for the claimant

#### 3.4 Username Expiration

Consider implementing a username expiration policy:

- Usernames are reserved for active users
- If a user is inactive for 12+ months, their username may be released
- Users receive notifications before username expiration

### 4. Security Considerations

#### 4.1 Preventing Username Squatting

- Implement rate limiting for username registration
- Consider a verification period for new accounts
- Monitor for patterns of mass registration

#### 4.2 Signature Verification

Ensure that users can only claim usernames for public keys they control:

```javascript
// Example of signature verification for username claiming
async function claimUsername(req, res) {
  const { username, pubkey, signature, event } = req.body;
  
  // Verify the signature matches the pubkey
  const isValid = await verifySignature(event, signature, pubkey);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Check username availability
  const existing = await db.query(
    'SELECT * FROM nip05_usernames WHERE username = $1',
    [username]
  );
  
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  
  // Save the username
  await db.query(
    'INSERT INTO nip05_usernames (username, pubkey) VALUES ($1, $2)',
    [username, pubkey]
  );
  
  return res.status(201).json({ success: true });
}
```

#### 4.3 Rate Limiting

Implement rate limiting for all NIP-05 related endpoints:

```javascript
// Example rate limiting middleware
const rateLimit = require('express-rate-limit');

const nip05Limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/nip05/', nip05Limiter);
```

### 5. Testing Plan

#### 5.1 Unit Tests

- Test username validation rules
- Test signature verification
- Test JSON generation for the well-known endpoint

#### 5.2 Integration Tests

- Test the full flow of claiming a username
- Test verification with external Nostr clients
- Test edge cases like special characters in usernames

#### 5.3 Load Testing

- Test the well-known endpoint under load
- Ensure caching is working correctly

### 6. Deployment Strategy

#### 6.1 Database Migration

Create a migration script for the new database table:

```javascript
// Migration script
async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS nip05_usernames (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      pubkey VARCHAR(64) NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT valid_username CHECK (username ~* '^[a-z0-9_]+$')
    );
    
    CREATE INDEX IF NOT EXISTS idx_nip05_usernames_pubkey ON nip05_usernames(pubkey);
    CREATE INDEX IF NOT EXISTS idx_nip05_usernames_username ON nip05_usernames(username);
  `);
}
```

#### 6.2 Phased Rollout

1. **Phase 1**: Deploy backend infrastructure and API endpoints
2. **Phase 2**: Add username selection to profile edit form
3. **Phase 3**: Update profile display to show verification
4. **Phase 4**: Announce the feature to users

### 7. Monitoring and Maintenance

#### 7.1 Monitoring

- Track the number of claimed usernames
- Monitor API endpoint performance
- Set up alerts for unusual activity

#### 7.2 Maintenance

- Regularly review and update the reserved username list
- Clean up expired or abandoned usernames
- Update the implementation as NIP-05 evolves

## Implementation Timeline

1. **Week 1**: Database schema and API endpoints
2. **Week 2**: Frontend components for username management
3. **Week 3**: Testing and security review
4. **Week 4**: Deployment and monitoring

## Conclusion

Implementing NIP-05 verification for Xeadline users will significantly enhance the platform's user experience and align with Nostr ecosystem standards. The technical implementation is straightforward, and the benefits for user identity and trust are substantial.

By offering username@xeadline.com identifiers, we strengthen the Xeadline brand while providing users with human-readable identifiers that work across the Nostr ecosystem.