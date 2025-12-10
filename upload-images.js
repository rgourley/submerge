// Script to upload local images to Vercel Blob Storage and update database
const { Pool } = require('pg');
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: POSTGRES_URL or DATABASE_URL environment variable not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function uploadImage(localPath, filename) {
    try {
        if (!fs.existsSync(localPath)) {
            console.log(`⚠️  Image not found: ${localPath}`);
            return null;
        }
        
        const fileBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath);
        const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/jpeg';
        
        console.log(`Uploading ${filename}...`);
        const { url } = await put(filename, fileBuffer, {
            access: 'public',
            contentType: mimeType,
        });
        
        console.log(`✓ Uploaded: ${url}`);
        return url;
    } catch (error) {
        console.error(`✗ Error uploading ${filename}:`, error.message);
        return null;
    }
}

async function updateImages() {
    try {
        console.log('Fetching releases and artists from database...');
        
        // Get all releases
        const releasesResult = await pool.query('SELECT * FROM releases');
        const releases = releasesResult.rows;
        
        // Get all artists
        const artistsResult = await pool.query('SELECT * FROM artists');
        const artists = artistsResult.rows;
        
        console.log(`Found ${releases.length} releases and ${artists.length} artists`);
        
        // Upload release images
        console.log('\n📸 Uploading release images...');
        for (const release of releases) {
            if (release.image && release.image.startsWith('/uploads/')) {
                const filename = path.basename(release.image);
                const localPath = path.join(__dirname, 'uploads', filename);
                
                const blobUrl = await uploadImage(localPath, `releases/${filename}`);
                
                if (blobUrl) {
                    await pool.query('UPDATE releases SET image = $1 WHERE id = $2', [blobUrl, release.id]);
                    console.log(`  Updated release ${release.id} with new image URL`);
                }
            } else if (release.image && !release.image.startsWith('http')) {
                console.log(`  ⚠️  Release ${release.id} has invalid image path: ${release.image}`);
            }
        }
        
        // Upload artist images
        console.log('\n👤 Uploading artist images...');
        for (const artist of artists) {
            if (artist.image && artist.image.startsWith('/uploads/')) {
                const filename = path.basename(artist.image);
                const localPath = path.join(__dirname, 'uploads', filename);
                
                const blobUrl = await uploadImage(localPath, `artists/${filename}`);
                
                if (blobUrl) {
                    await pool.query('UPDATE artists SET image = $1 WHERE id = $2', [blobUrl, artist.id]);
                    console.log(`  Updated artist ${artist.id} with new image URL`);
                }
            } else if (artist.image && !artist.image.startsWith('http')) {
                console.log(`  ⚠️  Artist ${artist.id} has invalid image path: ${artist.image}`);
            }
        }
        
        console.log('\n✅ Image upload complete!');
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Check if BLOB_READ_WRITE_TOKEN is set
if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable not set');
    console.error('Get it from: https://vercel.com/your-account/settings/tokens');
    process.exit(1);
}

updateImages();

