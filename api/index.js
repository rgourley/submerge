const express = require('express');
const { Pool } = require('pg');
const { put } = require('@vercel/blob');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Neon Postgres connection
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('WARNING: No database connection string found. Set POSTGRES_URL or DATABASE_URL environment variable.');
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
    console.log('✓ Connected to Neon Postgres database');
});

pool.on('error', (err) => {
    console.error('✗ Database connection error:', err);
});

// Initialize database tables
async function initDB() {
    try {
        // Create releases table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS releases (
                id TEXT PRIMARY KEY,
                slug TEXT UNIQUE,
                "artistId" TEXT,
                title TEXT,
                description TEXT,
                date TEXT,
                image TEXT,
                "spotifyUrl" TEXT,
                "soundcloudUrl" TEXT,
                "bandcampUrl" TEXT,
                "appleMusicUrl" TEXT,
                "youtubeUrl" TEXT,
                "tidalUrl" TEXT,
                "otherUrl" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP
            )
        `);
        
        // Add slug and description columns if they don't exist (for existing databases)
        await pool.query(`
            ALTER TABLE releases ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE
        `);
        await pool.query(`
            ALTER TABLE releases ADD COLUMN IF NOT EXISTS description TEXT
        `);
        
        // Add tidalUrl column if it doesn't exist (for existing databases)
        await pool.query(`
            ALTER TABLE releases ADD COLUMN IF NOT EXISTS "tidalUrl" TEXT
        `);
        
        // Create artists table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS artists (
                id TEXT PRIMARY KEY,
                slug TEXT UNIQUE,
                name TEXT,
                bio TEXT,
                image TEXT,
                "websiteUrl" TEXT,
                "instagramUrl" TEXT,
                "soundcloudUrl" TEXT,
                "spotifyUrl" TEXT,
                "bandcampUrl" TEXT,
                "otherUrl" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP
            )
        `);
        
        // Add slug column if it doesn't exist (for existing databases)
        await pool.query(`
            ALTER TABLE artists ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE
        `);
        
        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Initialize on startup
initDB();

// Configure multer for memory storage (we'll upload to Vercel Blob)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Helper functions for releases
async function getReleases() {
    try {
        const result = await pool.query('SELECT * FROM releases ORDER BY date DESC, "createdAt" DESC');
        return result.rows;
    } catch (error) {
        console.error('Error getting releases:', error);
        return [];
    }
}

// Generate SEO-friendly slug from title
function generateReleaseSlug(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Ensure unique release slug
async function ensureUniqueReleaseSlug(slug, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
        const query = excludeId 
            ? 'SELECT id FROM releases WHERE slug = $1 AND id != $2'
            : 'SELECT id FROM releases WHERE slug = $1';
        const params = excludeId ? [uniqueSlug, excludeId] : [uniqueSlug];
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return uniqueSlug;
        }
        
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
}

async function saveRelease(release) {
    try {
        // Generate or use existing slug
        let slug = release.slug || generateReleaseSlug(release.title);
        if (slug) {
            slug = await ensureUniqueReleaseSlug(slug, release.id);
        }
        
        const query = `
            INSERT INTO releases (id, slug, "artistId", title, description, date, image, "spotifyUrl", "soundcloudUrl", "bandcampUrl", "appleMusicUrl", "youtubeUrl", "tidalUrl", "otherUrl", "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) 
            DO UPDATE SET 
                slug = EXCLUDED.slug,
                "artistId" = EXCLUDED."artistId",
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                date = EXCLUDED.date,
                image = EXCLUDED.image,
                "spotifyUrl" = EXCLUDED."spotifyUrl",
                "soundcloudUrl" = EXCLUDED."soundcloudUrl",
                "bandcampUrl" = EXCLUDED."bandcampUrl",
                "appleMusicUrl" = EXCLUDED."appleMusicUrl",
                "youtubeUrl" = EXCLUDED."youtubeUrl",
                "tidalUrl" = EXCLUDED."tidalUrl",
                "otherUrl" = EXCLUDED."otherUrl",
                "updatedAt" = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [
            release.id,
            slug,
            release.artistId || '',
            release.title || '',
            release.description || '',
            release.date || '',
            release.image || '',
            release.spotifyUrl || '',
            release.soundcloudUrl || '',
            release.bandcampUrl || '',
            release.appleMusicUrl || '',
            release.youtubeUrl || '',
            release.tidalUrl || '',
            release.otherUrl || '',
            release.createdAt || new Date()
        ]);
        
        // Return release with slug
        release.slug = slug;
        return release;
    } catch (error) {
        console.error('Error saving release:', error);
        throw error;
    }
}

async function deleteRelease(id) {
    try {
        const result = await pool.query('DELETE FROM releases WHERE id = $1', [id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting release:', error);
        throw error;
    }
}

// Helper functions for artists
async function getArtists() {
    try {
        const result = await pool.query('SELECT * FROM artists ORDER BY name');
        return result.rows;
    } catch (error) {
        console.error('Error getting artists:', error);
        return [];
    }
}

// Generate SEO-friendly slug from name
function generateSlug(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Ensure unique slug
async function ensureUniqueSlug(slug, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
        const query = excludeId 
            ? 'SELECT id FROM artists WHERE slug = $1 AND id != $2'
            : 'SELECT id FROM artists WHERE slug = $1';
        const params = excludeId ? [uniqueSlug, excludeId] : [uniqueSlug];
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return uniqueSlug;
        }
        
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
}

async function saveArtist(artist) {
    try {
        // Generate or use existing slug
        let slug = artist.slug || generateSlug(artist.name);
        if (slug) {
            slug = await ensureUniqueSlug(slug, artist.id);
        }
        
        const query = `
            INSERT INTO artists (id, slug, name, bio, image, "websiteUrl", "instagramUrl", "soundcloudUrl", "spotifyUrl", "bandcampUrl", "otherUrl", "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) 
            DO UPDATE SET 
                slug = EXCLUDED.slug,
                name = EXCLUDED.name,
                bio = EXCLUDED.bio,
                image = EXCLUDED.image,
                "websiteUrl" = EXCLUDED."websiteUrl",
                "instagramUrl" = EXCLUDED."instagramUrl",
                "soundcloudUrl" = EXCLUDED."soundcloudUrl",
                "spotifyUrl" = EXCLUDED."spotifyUrl",
                "bandcampUrl" = EXCLUDED."bandcampUrl",
                "otherUrl" = EXCLUDED."otherUrl",
                "updatedAt" = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [
            artist.id,
            slug,
            artist.name || '',
            artist.bio || '',
            artist.image || '',
            artist.websiteUrl || '',
            artist.instagramUrl || '',
            artist.soundcloudUrl || '',
            artist.spotifyUrl || '',
            artist.bandcampUrl || '',
            artist.otherUrl || '',
            artist.createdAt || new Date()
        ]);
        
        // Return artist with slug
        artist.slug = slug;
        return artist;
    } catch (error) {
        console.error('Error saving artist:', error);
        throw error;
    }
}

async function deleteArtist(id) {
    try {
        const result = await pool.query('DELETE FROM artists WHERE id = $1', [id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting artist:', error);
        throw error;
    }
}

// Upload image to Vercel Blob Storage
async function uploadImage(file, filename) {
    if (!file) return null;
    
    try {
        const { url } = await put(filename, file.buffer, {
            access: 'public',
            contentType: file.mimetype,
        });
        return url;
    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        throw error;
    }
}

// API Routes

// Get all releases
app.get('/api/releases', async (req, res) => {
    try {
        console.log('GET /api/releases - Fetching releases...');
        
        // Check database connection
        if (!connectionString) {
            console.error('No database connection string');
            return res.status(500).json({ 
                error: 'Database not configured', 
                message: 'POSTGRES_URL environment variable is not set' 
            });
        }
        
        const releases = await getReleases();
        console.log(`Found ${releases.length} releases`);
        res.json(releases);
    } catch (error) {
        console.error('Error getting releases:', error);
        res.status(500).json({ 
            error: 'Failed to get releases', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get single release (by ID or slug)
app.get('/api/releases/:identifier', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        // Try to find by slug first, then by ID
        let result = await pool.query('SELECT * FROM releases WHERE slug = $1', [identifier]);
        if (result.rows.length === 0) {
            result = await pool.query('SELECT * FROM releases WHERE id = $1', [identifier]);
        }
        
        const release = result.rows[0];
        
        if (!release) {
            return res.status(404).json({ error: 'Release not found' });
        }
        
        res.json(release);
    } catch (error) {
        console.error('Error getting release:', error);
        res.status(500).json({ error: 'Failed to get release' });
    }
});

// Create new release
app.post('/api/releases', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.image || '';
        
        // Upload image if provided
        if (req.file) {
            const filename = `releases/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
            imageUrl = await uploadImage(req.file, filename);
        }
        
        const newRelease = {
            id: Date.now().toString(),
            artistId: req.body.artistId || '',
            title: req.body.title || '',
            description: req.body.description || '',
            date: req.body.date || new Date().getFullYear().toString(),
            image: imageUrl,
            spotifyUrl: req.body.spotifyUrl || '',
            soundcloudUrl: req.body.soundcloudUrl || '',
            bandcampUrl: req.body.bandcampUrl || '',
            appleMusicUrl: req.body.appleMusicUrl || '',
            youtubeUrl: req.body.youtubeUrl || '',
            tidalUrl: req.body.tidalUrl || '',
            otherUrl: req.body.otherUrl || '',
            createdAt: new Date().toISOString()
        };
        
        await saveRelease(newRelease);
        res.json(newRelease);
    } catch (error) {
        console.error('Error creating release:', error);
        res.status(500).json({ error: 'Failed to create release' });
    }
});

// Update release
app.put('/api/releases/:id', upload.single('image'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM releases WHERE id = $1', [req.params.id]);
        const release = result.rows[0];
        
        if (!release) {
            return res.status(404).json({ error: 'Release not found' });
        }
        
        // Upload new image if provided
        if (req.file) {
            const filename = `releases/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
            release.image = await uploadImage(req.file, filename);
        } else if (req.body.image) {
            release.image = req.body.image;
        }
        
        // Update fields
        release.artistId = req.body.artistId !== undefined ? req.body.artistId : release.artistId;
        release.title = req.body.title || release.title;
        release.description = req.body.description !== undefined ? req.body.description : release.description;
        release.date = req.body.date || release.date;
        release.spotifyUrl = req.body.spotifyUrl || release.spotifyUrl;
        release.soundcloudUrl = req.body.soundcloudUrl || release.soundcloudUrl;
        release.bandcampUrl = req.body.bandcampUrl || release.bandcampUrl;
        release.appleMusicUrl = req.body.appleMusicUrl || release.appleMusicUrl;
        release.youtubeUrl = req.body.youtubeUrl || release.youtubeUrl;
        release.tidalUrl = req.body.tidalUrl !== undefined ? req.body.tidalUrl : release.tidalUrl;
        release.otherUrl = req.body.otherUrl || release.otherUrl;
        
        await saveRelease(release);
        res.json(release);
    } catch (error) {
        console.error('Error updating release:', error);
        res.status(500).json({ error: 'Failed to update release' });
    }
});

// Delete release
app.delete('/api/releases/:id', async (req, res) => {
    try {
        const deleted = await deleteRelease(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Release not found' });
        }
        res.json({ message: 'Release deleted successfully' });
    } catch (error) {
        console.error('Error deleting release:', error);
        res.status(500).json({ error: 'Failed to delete release' });
    }
});

// ========== ARTIST API ROUTES ==========

// Get all artists
app.get('/api/artists', async (req, res) => {
    try {
        console.log('GET /api/artists - Fetching artists...');
        
        // Check database connection
        if (!connectionString) {
            console.error('No database connection string');
            return res.status(500).json({ 
                error: 'Database not configured', 
                message: 'POSTGRES_URL environment variable is not set' 
            });
        }
        
        const artists = await getArtists();
        console.log(`Found ${artists.length} artists`);
        res.json(artists);
    } catch (error) {
        console.error('Error getting artists:', error);
        res.status(500).json({ 
            error: 'Failed to get artists', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get single artist (by ID or slug)
app.get('/api/artists/:identifier', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        // Try to find by slug first, then by ID
        let result = await pool.query('SELECT * FROM artists WHERE slug = $1', [identifier]);
        if (result.rows.length === 0) {
            result = await pool.query('SELECT * FROM artists WHERE id = $1', [identifier]);
        }
        
        const artist = result.rows[0];
        
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        
        res.json(artist);
    } catch (error) {
        console.error('Error getting artist:', error);
        res.status(500).json({ error: 'Failed to get artist' });
    }
});

// Create new artist
app.post('/api/artists', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.image || '';
        
        // Upload image if provided
        if (req.file) {
            const filename = `artists/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
            imageUrl = await uploadImage(req.file, filename);
        }
        
        const newArtist = {
            id: Date.now().toString(),
            name: req.body.name || '',
            bio: req.body.bio || '',
            image: imageUrl,
            websiteUrl: req.body.websiteUrl || '',
            instagramUrl: req.body.instagramUrl || '',
            soundcloudUrl: req.body.soundcloudUrl || '',
            spotifyUrl: req.body.spotifyUrl || '',
            bandcampUrl: req.body.bandcampUrl || '',
            otherUrl: req.body.otherUrl || '',
            createdAt: new Date().toISOString()
        };
        
        await saveArtist(newArtist);
        res.json(newArtist);
    } catch (error) {
        console.error('Error creating artist:', error);
        res.status(500).json({ error: 'Failed to create artist' });
    }
});

// Update artist
app.put('/api/artists/:id', upload.single('image'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM artists WHERE id = $1', [req.params.id]);
        const artist = result.rows[0];
        
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        
        // Upload new image if provided
        if (req.file) {
            const filename = `artists/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
            artist.image = await uploadImage(req.file, filename);
        } else if (req.body.image) {
            artist.image = req.body.image;
        }
        
        // Update fields
        artist.name = req.body.name || artist.name;
        artist.bio = req.body.bio || artist.bio;
        artist.websiteUrl = req.body.websiteUrl || artist.websiteUrl;
        artist.instagramUrl = req.body.instagramUrl || artist.instagramUrl;
        artist.soundcloudUrl = req.body.soundcloudUrl || artist.soundcloudUrl;
        artist.spotifyUrl = req.body.spotifyUrl || artist.spotifyUrl;
        artist.bandcampUrl = req.body.bandcampUrl || artist.bandcampUrl;
        artist.otherUrl = req.body.otherUrl || artist.otherUrl;
        
        // Regenerate slug if name changed
        if (req.body.name && req.body.name !== artist.name) {
            artist.slug = null; // Will be regenerated in saveArtist
        }
        
        await saveArtist(artist);
        res.json(artist);
    } catch (error) {
        console.error('Error updating artist:', error);
        res.status(500).json({ error: 'Failed to update artist' });
    }
});

// Delete artist
app.delete('/api/artists/:id', async (req, res) => {
    try {
        // Check if artist has releases
        const releasesResult = await pool.query('SELECT COUNT(*) FROM releases WHERE "artistId" = $1', [req.params.id]);
        const releaseCount = parseInt(releasesResult.rows[0].count);
        
        if (releaseCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete artist with existing releases. Delete releases first.' 
            });
        }
        
        const deleted = await deleteArtist(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        res.json({ message: 'Artist deleted successfully' });
    } catch (error) {
        console.error('Error deleting artist:', error);
        res.status(500).json({ error: 'Failed to delete artist' });
    }
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin.html'));
});

// Serve artist page (by slug or ID)
app.get('/artist/:identifier', (req, res) => {
    res.sendFile(path.join(__dirname, '../artist.html'));
});

// Serve release page (by slug or ID)
app.get('/release/:identifier', (req, res) => {
    res.sendFile(path.join(__dirname, '../release.html'));
});

// Export for Vercel serverless
module.exports = app;

