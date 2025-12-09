const express = require('express');
const { MongoClient } = require('mongodb');
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

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/submerge';
let db = null;
let client = null;

async function connectDB() {
    if (db) return db;
    
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db('submerge');
        console.log('Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Initialize DB connection
connectDB().catch(console.error);

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
    const database = await connectDB();
    const collection = database.collection('releases');
    return await collection.find({}).toArray();
}

async function saveRelease(release) {
    const database = await connectDB();
    const collection = database.collection('releases');
    if (release._id) {
        await collection.updateOne({ _id: release._id }, { $set: release });
        return release;
    } else {
        const result = await collection.insertOne(release);
        release._id = result.insertedId;
        return release;
    }
}

async function deleteRelease(id) {
    const database = await connectDB();
    const collection = database.collection('releases');
    // Try to find by id field first (string), then by _id
    const result = await collection.deleteOne({ $or: [{ id: id }, { _id: id }] });
    return result;
}

// Helper functions for artists
async function getArtists() {
    const database = await connectDB();
    const collection = database.collection('artists');
    return await collection.find({}).toArray();
}

async function saveArtist(artist) {
    const database = await connectDB();
    const collection = database.collection('artists');
    if (artist._id) {
        await collection.updateOne({ _id: artist._id }, { $set: artist });
        return artist;
    } else {
        const result = await collection.insertOne(artist);
        artist._id = result.insertedId;
        return artist;
    }
}

async function deleteArtist(id) {
    const database = await connectDB();
    const collection = database.collection('artists');
    // Try to find by id field first (string), then by _id
    const result = await collection.deleteOne({ $or: [{ id: id }, { _id: id }] });
    return result;
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
        const database = await connectDB();
        const collection = database.collection('releases');
        // Try to find by id field first (string), then by _id
        const release = await collection.findOne({ 
            $or: [{ id: req.params.id }, { _id: req.params.id }] 
        });
        
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
        
        const release = await saveRelease(newRelease);
        res.json(release);
    } catch (error) {
        console.error('Error creating release:', error);
        res.status(500).json({ error: 'Failed to create release' });
    }
});

// Update release
app.put('/api/releases/:id', upload.single('image'), async (req, res) => {
    try {
        const database = await connectDB();
        const collection = database.collection('releases');
        
        // Try to find by id field first (string), then by _id
        const release = await collection.findOne({ 
            $or: [{ id: req.params.id }, { _id: req.params.id }] 
        });
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
        release.updatedAt = new Date().toISOString();
        
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
        const result = await deleteRelease(req.params.id);
        if (result.deletedCount === 0) {
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
        const database = await connectDB();
        const collection = database.collection('artists');
        // Try to find by id field first (string), then by _id
        const artist = await collection.findOne({ 
            $or: [{ id: req.params.id }, { _id: req.params.id }] 
        });
        
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
        
        const artist = await saveArtist(newArtist);
        res.json(artist);
    } catch (error) {
        console.error('Error creating artist:', error);
        res.status(500).json({ error: 'Failed to create artist' });
    }
});

// Update artist
app.put('/api/artists/:id', upload.single('image'), async (req, res) => {
    try {
        const database = await connectDB();
        const collection = database.collection('artists');
        
        // Try to find by id field first (string), then by _id
        const artist = await collection.findOne({ 
            $or: [{ id: req.params.id }, { _id: req.params.id }] 
        });
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
        artist.updatedAt = new Date().toISOString();
        
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
        const database = await connectDB();
        const releasesCollection = database.collection('releases');
        const artistReleases = await releasesCollection.find({ artistId: req.params.id }).toArray();
        
        if (artistReleases.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete artist with existing releases. Delete releases first.' 
            });
        }
        
        const result = await deleteArtist(req.params.id);
        if (result.deletedCount === 0) {
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

