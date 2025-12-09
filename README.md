# submerge

Website for submerge, an independent electronic music label.

## Features

- Clean, minimal design
- Large and tiny typography for visual interest
- Responsive layout
- Smooth scrolling and animations
- Dark theme optimized for electronic music aesthetic
- **Backend admin panel** to manage releases
- Upload images and add streaming links

## Setup

### Install Dependencies

```bash
npm install
```

### Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

- **Main website**: `http://localhost:3000`
- **Admin panel**: `http://localhost:3000/admin`

## Admin Panel

Access the admin panel at `/admin` to:

- Add new releases with cover images
- Edit existing releases
- Delete releases
- Add streaming links (Spotify, SoundCloud, Bandcamp, Apple Music, YouTube, etc.)
- Upload images or use image URLs

### Adding a Release

1. Go to `http://localhost:3000/admin`
2. Click "+ add release"
3. Fill in:
   - Artist name
   - Release title
   - Release date
   - Cover image (upload file or paste URL)
   - Streaming service URLs (optional)
4. Click "save release"

Releases will automatically appear on the main website.

## Data Storage

Releases are stored in `data/releases.json`. Images are stored in the `uploads/` directory.

**Note:** Make sure to backup these files if you're deploying to production!

## Deployment to Vercel

The project is configured for Vercel deployment. However, **important limitations**:

⚠️ **Vercel uses serverless functions with a read-only filesystem**. This means:
- File uploads won't persist (they'll be lost between deployments)
- JSON data files won't persist
- You'll need to use a database (MongoDB, PostgreSQL, etc.) and cloud storage (AWS S3, Cloudinary, Vercel Blob) for production

### To deploy to Vercel:

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

The `vercel.json` configuration file is already set up. For production use, consider migrating to:
- **Database**: MongoDB Atlas, Supabase, or Vercel Postgres
- **File Storage**: Vercel Blob Storage, Cloudinary, or AWS S3

## Customization

- Add your releases in `releases.js` (see examples above)
- Replace image placeholders with actual album artwork and artist photos
- Update content in `index.html` with your actual artists and information
- Modify colors and typography in `styles.css` to match your brand
- Add your social media links in the contact section

## Structure

- `index.html` - Main website
- `styles.css` - Website styling
- `script.js` - Website interactive features
- `releases.js` - Fetches and displays releases from API
- `admin.html` - Admin panel interface
- `admin-styles.css` - Admin panel styling
- `admin.js` - Admin panel functionality
- `server.js` - Express server and API
- `package.json` - Node.js dependencies
- `data/releases.json` - Release data (auto-generated)
- `uploads/` - Uploaded images directory

