# NIP-05 Simple Implementation Guide

## Overview

This document provides a simplified guide for implementing NIP-05 verification with custom username@xeadline.com identifiers for Xeadline users.

## What is NIP-05?

NIP-05 is a Nostr Implementation Possibility that provides a way to verify that a Nostr public key belongs to a specific internet identifier (similar to an email address). It works by:

1. Having a domain (like xeadline.com) host a well-known JSON file at `/.well-known/nostr.json`
2. This JSON file maps usernames to public keys
3. Clients can verify that a public key belongs to a username@domain by fetching this file and checking the mapping

## Implementation Steps

### 1. Database Setup

Create a table to store username-to-pubkey mappings:

```sql
CREATE TABLE nip05_usernames (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  pubkey VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nip05_usernames_pubkey ON nip05_usernames(pubkey);
CREATE INDEX idx_nip05_usernames_username ON nip05_usernames(username);
```

### 2. API Endpoints

#### 2.1 Well-known Endpoint

Create a dynamic endpoint at `/.well-known/nostr.json`:

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
    names: {}
  };
  
  users.forEach(user => {
    response.names[user.username] = user.pubkey;
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

#### 2.2 Username Management Endpoints

Create endpoints for username management:

```javascript
// Check username availability
export async function GET(request) {
  const { username } = request.params;
  
  const result = await db.query(
    'SELECT EXISTS(SELECT 1 FROM nip05_usernames WHERE username = $1)',
    [username]
  );
  
  return new Response(JSON.stringify({
    available: !result.rows[0].exists
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Claim username
export async function POST(request) {
  const { username, pubkey } = await request.json();
  
  // Validate username
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return new Response(JSON.stringify({
      error: 'Invalid username format'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    await db.query(
      'INSERT INTO nip05_usernames (username, pubkey) VALUES ($1, $2)',
      [username, pubkey]
    );
    
    return new Response(JSON.stringify({
      success: true,
      nip05: `${username}@xeadline.com`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      return new Response(JSON.stringify({
        error: 'Username already taken'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}
```

### 3. Frontend Implementation

#### 3.1 Username Selection Component

Add a username selection component to the profile settings:

```jsx
const [username, setUsername] = useState('');
const [usernameAvailable, setUsernameAvailable] = useState(false);
const [usernameChecking, setUsernameChecking] = useState(false);

const checkUsernameAvailability = async (value) => {
  if (!value || value.length < 3) return;
  
  setUsernameChecking(true);
  try {
    const response = await fetch(`/api/nip05/check/${value}`);
    const data = await response.json();
    setUsernameAvailable(data.available);
  } catch (error) {
    console.error('Error checking username:', error);
  } finally {
    setUsernameChecking(false);
  }
};

// In the JSX
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
        : 'Username already taken'}
    </p>
  )}
</div>
```

#### 3.2 Profile Display Component

Update the profile display to show NIP-05 verification:

```jsx
// In the profile component
{profile.nip05 && (
  <div className="flex items-center mt-1">
    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-1" />
    <span className="text-sm text-gray-600">
      {profile.nip05}
    </span>
  </div>
)}
```

### 4. Integration with Nostr Profile Updates

When updating a user's profile, include the NIP-05 identifier in the metadata:

```javascript
// When updating a user's profile
const metadata = {
  name: displayName,
  display_name: displayName,
  username: username,
  picture: profilePicture,
  banner: bannerImage,
  about: bio,
  nip05: username ? `${username}@xeadline.com` : undefined
};

// Create and publish the event
const event = {
  kind: 0,
  pubkey: userPublicKey,
  created_at: Math.floor(Date.now() / 1000),
  content: JSON.stringify(metadata),
  tags: []
};
```

## Testing

1. **Username Claiming**:
   - Test claiming an available username
   - Test attempting to claim an already taken username
   - Test username validation rules

2. **Well-known Endpoint**:
   - Test retrieving all usernames
   - Test retrieving a specific username
   - Test with non-existent username

3. **Verification**:
   - Test with external Nostr clients to ensure they can verify the NIP-05 identifier

## Deployment

1. Run the database migration to create the nip05_usernames table
2. Deploy the API endpoints
3. Deploy the frontend components
4. Test the complete flow in the production environment

## Conclusion

This simplified implementation provides the core functionality needed for NIP-05 verification with custom username@xeadline.com identifiers. It follows the NIP-05 standard while keeping the implementation straightforward and maintainable.