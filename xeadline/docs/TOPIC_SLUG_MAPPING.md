# Topic Slug Mapping System

This document explains how the topic slug mapping system works in Xeadline and how to set it up.

## Overview

The topic slug mapping system allows for clean, human-readable URLs for topics. Instead of using the Nostr topic ID (which is a combination of a pubkey and a d-identifier), we use a simple slug like `bitcoin` or `lightning`.

For example, instead of:
```
/t/abc123def456:bitcoin-1234567
```

We can use:
```
/t/bitcoin
```

## How It Works

1. When a user creates a topic, they provide a name which is automatically converted to a slug
2. The system checks if the slug is available
3. If available, the topic is created and the slug is mapped to the topic ID in the database
4. When a user visits `/t/bitcoin`, the system looks up the topic ID from the slug and fetches the topic data

## Setup Instructions

### 1. Create the Supabase Table

You need to create a `topic_slugs` table in your Supabase database. We've provided a migration script to make this easy.

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `xeadline/supabase/migrations/20250314_create_topic_slugs.sql`
4. Paste it into the SQL Editor and run the query

The script will:
- Create the `topic_slugs` table if it doesn't exist
- Add appropriate indexes for performance
- Set up Row Level Security (RLS) policies for proper access control

### 2. Environment Variables

Make sure your `.env.local` file has the following variables set:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is needed for the API endpoints to create and read slug mappings.

## API Endpoints

The system provides two main API endpoints:

### GET /api/topic/slug?slug=bitcoin

Returns the topic ID for a given slug.

Response:
```json
{
  "topicId": "abc123def456:bitcoin-1234567"
}
```

### POST /api/topic/slug

Creates a new slug mapping.

Request:
```json
{
  "slug": "bitcoin",
  "topicId": "abc123def456:bitcoin-1234567"
}
```

Response:
```json
{
  "id": "uuid",
  "slug": "bitcoin",
  "topic_id": "abc123def456:bitcoin-1234567",
  "created_at": "2025-03-14T23:00:00.000Z",
  "updated_at": "2025-03-14T23:00:00.000Z"
}
```

## Testing

You can test the slug mapping system by visiting `/test-slug` in your browser. This page provides a UI for:

- Generating slugs from topic names
- Checking slug availability
- Creating slug mappings
- Looking up topic IDs from slugs

## Troubleshooting

If you encounter errors about the `topic_slugs` table not existing, make sure you've run the migration script in the Supabase SQL Editor.

If you're having issues with permissions, check that the RLS policies were created correctly and that you're using the service role key for the API endpoints.