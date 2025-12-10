# Vercel Deployment Setup

This project has been migrated to work with Vercel using MongoDB and Vercel Blob Storage.

## Setup Steps

### 1. MongoDB Atlas (Free Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new cluster (free tier M0)
4. Create a database user
5. Whitelist your IP (or use 0.0.0.0/0 for Vercel)
6. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

### 2. Vercel Blob Storage

1. Go to your Vercel project settings
2. Navigate to "Storage" → "Blob"
3. Create a new Blob store (or it may be automatically available)
4. Get your Blob store token (or it's automatically available via `BLOB_READ_WRITE_TOKEN` env var)

### 3. Set Environment Variables in Vercel

In your Vercel project settings → Environment Variables, add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/submerge?retryWrites=true&w=majority
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx (automatically set by Vercel)
```

### 4. Deploy

```bash
vercel --prod
```

## Migration from Local JSON Files

If you have existing data in `data/releases.json` and `data/artists.json`, you can migrate it:

1. Install dependencies: `npm install`
2. Run the migration script (create one if needed) or manually import via MongoDB Compass
3. The new server uses `server-vercel.js` instead of `server.js`

## Local Development

For local development, you can either:

1. Use MongoDB Atlas (same as production)
2. Or use the original `server.js` with local files

To use the Vercel version locally:
```bash
MONGODB_URI=your_mongodb_uri BLOB_READ_WRITE_TOKEN=your_token node server-vercel.js
```



