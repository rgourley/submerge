const express = require('express');
const { Pool } = require('pg');
const { put } = require('@vercel/blob');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Neon Postgres connection
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDB() {
    try {
        // Create releases table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS releases (
                id TEXT PRIMARY KEY,
                "artistId" TEXT,
                title TEXT,
                date TEXT,
                image TEXT,
                "spotifyUrl" TEXT,
                "soundcloudUrl" TEXT,
                "bandcampUrl" TEXT,
                "appleMusicUrl" TEXT,
                "youtubeUrl" TEXT,
                "otherUrl" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP
            )
        `);
        
        // Create artists table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS artists (
                id TEXT PRIMARY KEY,
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

async function saveRelease(release) {
    try {
        const query = `
            INSERT INTO releases (id, "artistId", title, date, image, "spotifyUrl", "soundcloudUrl", "bandcampUrl", "appleMusicUrl", "youtubeUrl", "otherUrl", "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) 
            DO UPDATE SET 
                "artistId" = EXCLUDED."artistId",
                title = EXCLUDED.title,
                date = EXCLUDED.date,
                image = EXCLUDED.image,
                "spotifyUrl" = EXCLUDED."spotifyUrl",
                "soundcloudUrl" = EXCLUDED."soundcloudUrl",
                "bandcampUrl" = EXCLUDED."bandcampUrl",
                "appleMusicUrl" = EXCLUDED."appleMusicUrl",
                "youtubeUrl" = EXCLUDED."youtubeUrl",
                "otherUrl" = EXCLUDED."otherUrl",
                "updatedAt" = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [
            release.id,
            release.artistId || '',
            release.title || '',
            release.date || '',
            release.image || '',
            release.spotifyUrl || '',
            release.soundcloudUrl || '',
            release.bandcampUrl || '',
            release.appleMusicUrl || '',
            release.youtubeUrl || '',
            release.otherUrl || '',
            release.createdAt || new Date()
        ]);
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

async function saveArtist(artist) {
    try {
        const query = `
            INSERT INTO artists (id, name, bio, image, "websiteUrl", "instagramUrl", "soundcloudUrl", "spotifyUrl", "bandcampUrl", "otherUrl", "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) 
            DO UPDATE SET 
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
        const blob = await put(filename, file.buffer, {
            access: 'public',
            contentType: file.mimetype,
        });
        return blob.url;
    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        throw error;
    }
}

// API Routes

// Get all releases
app.get('/api/releases', async (req, res) => {
    try {
        const releases = await getReleases();
        res.json(releases);
    } catch (error) {
        console.error('Error getting releases:', error);
        res.status(500).json({ error: 'Failed to get releases' });
    }
});

// Get single release
app.get('/api/releases/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM releases WHERE id = $1', [req.params.id]);
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
            date: req.body.date || new Date().getFullYear().toString(),
            image: imageUrl,
            spotifyUrl: req.body.spotifyUrl || '',
            soundcloudUrl: req.body.soundcloudUrl || '',
            bandcampUrl: req.body.bandcampUrl || '',
            appleMusicUrl: req.body.appleMusicUrl || '',
            youtubeUrl: req.body.youtubeUrl || '',
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
        release.date = req.body.date || release.date;
        release.spotifyUrl = req.body.spotifyUrl || release.spotifyUrl;
        release.soundcloudUrl = req.body.soundcloudUrl || release.soundcloudUrl;
        release.bandcampUrl = req.body.bandcampUrl || release.bandcampUrl;
        release.appleMusicUrl = req.body.appleMusicUrl || release.appleMusicUrl;
        release.youtubeUrl = req.body.youtubeUrl || release.youtubeUrl;
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
        const artists = await getArtists();
        res.json(artists);
    } catch (error) {
        console.error('Error getting artists:', error);
        res.status(500).json({ error: 'Failed to get artists' });
    }
});

// Get single artist
app.get('/api/artists/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM artists WHERE id = $1', [req.params.id]);
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
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve artist page
app.get('/artist/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'artist.html'));
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Export for Vercel serverless
module.exports = app;

// Start server only if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Admin panel: http://localhost:${PORT}/admin`);
    });
}

