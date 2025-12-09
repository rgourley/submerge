const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
// Serve uploads - handle both local and Vercel paths
app.use('/uploads', express.static(uploadsDir));
app.use('/tmp/uploads', express.static(uploadsDir));

// Ensure uploads directory exists (use /tmp on Vercel)
const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (error) {
        console.error('Error creating uploads directory:', error);
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = req.path.includes('/artists') ? 'artist-' : 'release-';
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
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

// Data file paths (use /tmp on Vercel)
const dataDir = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const releasesFile = path.join(dataDir, 'releases.json');
const artistsFile = path.join(dataDir, 'artists.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Initialize data files if they don't exist
if (!fs.existsSync(releasesFile)) {
    try {
        fs.writeFileSync(releasesFile, JSON.stringify([], null, 2));
    } catch (error) {
        console.error('Error creating releases file:', error);
    }
}
if (!fs.existsSync(artistsFile)) {
    try {
        fs.writeFileSync(artistsFile, JSON.stringify([], null, 2));
    } catch (error) {
        console.error('Error creating artists file:', error);
    }
}

// Helper functions for releases
function getReleases() {
    try {
        const data = fs.readFileSync(releasesFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading releases:', error);
        return [];
    }
}

function saveReleases(releases) {
    try {
        fs.writeFileSync(releasesFile, JSON.stringify(releases, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving releases:', error);
        return false;
    }
}

// Helper functions for artists
function getArtists() {
    try {
        const data = fs.readFileSync(artistsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading artists:', error);
        return [];
    }
}

function saveArtists(artists) {
    try {
        fs.writeFileSync(artistsFile, JSON.stringify(artists, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving artists:', error);
        return false;
    }
}

// API Routes

// Get all releases
app.get('/api/releases', (req, res) => {
    const releases = getReleases();
    res.json(releases);
});

// Get single release
app.get('/api/releases/:id', (req, res) => {
    const releases = getReleases();
    const release = releases.find(r => r.id === req.params.id);
    
    if (!release) {
        return res.status(404).json({ error: 'Release not found' });
    }
    
    res.json(release);
});

// Create new release
app.post('/api/releases', upload.single('image'), (req, res) => {
    const releases = getReleases();
    
    const newRelease = {
        id: Date.now().toString(),
        artistId: req.body.artistId || '',
        title: req.body.title || '',
        date: req.body.date || new Date().getFullYear().toString(),
        image: req.file ? (isVercel ? `/tmp/uploads/${req.file.filename}` : `/uploads/${req.file.filename}`) : req.body.image || '',
        spotifyUrl: req.body.spotifyUrl || '',
        soundcloudUrl: req.body.soundcloudUrl || '',
        bandcampUrl: req.body.bandcampUrl || '',
        appleMusicUrl: req.body.appleMusicUrl || '',
        youtubeUrl: req.body.youtubeUrl || '',
        otherUrl: req.body.otherUrl || '',
        createdAt: new Date().toISOString()
    };
    
    releases.push(newRelease);
    
    if (saveReleases(releases)) {
        res.json(newRelease);
    } else {
        res.status(500).json({ error: 'Failed to save release' });
    }
});

// Update release
app.put('/api/releases/:id', upload.single('image'), (req, res) => {
    const releases = getReleases();
    const index = releases.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Release not found' });
    }
    
    const release = releases[index];
    
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
    
    // Update image if new one uploaded
    if (req.file) {
        // Delete old image if it exists
        if (release.image && (release.image.startsWith('/uploads/') || release.image.startsWith('/tmp/uploads/'))) {
            const oldImagePath = release.image.startsWith('/tmp/') 
                ? release.image 
                : path.join(__dirname, release.image);
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (error) {
                    console.error('Error deleting old image:', error);
                }
            }
        }
        release.image = isVercel ? `/tmp/uploads/${req.file.filename}` : `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
        release.image = req.body.image;
    }
    
    release.updatedAt = new Date().toISOString();
    
    if (saveReleases(releases)) {
        res.json(release);
    } else {
        res.status(500).json({ error: 'Failed to update release' });
    }
});

// Delete release
app.delete('/api/releases/:id', (req, res) => {
    const releases = getReleases();
    const index = releases.findIndex(r => r.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Release not found' });
    }
    
    const release = releases[index];
    
        // Delete associated image
        if (release.image && (release.image.startsWith('/uploads/') || release.image.startsWith('/tmp/uploads/'))) {
            const imagePath = release.image.startsWith('/tmp/') 
                ? release.image 
                : path.join(__dirname, release.image);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                } catch (error) {
                    console.error('Error deleting image:', error);
                }
            }
        }
    
    releases.splice(index, 1);
    
    if (saveReleases(releases)) {
        res.json({ message: 'Release deleted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to delete release' });
    }
});

// Serve artist page (before static files to avoid conflicts)
app.get('/artist/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'artist.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== ARTIST API ROUTES ==========

// Get all artists
app.get('/api/artists', (req, res) => {
    const artists = getArtists();
    res.json(artists);
});

// Get single artist
app.get('/api/artists/:id', (req, res) => {
    const artists = getArtists();
    const artist = artists.find(a => a.id === req.params.id);
    
    if (!artist) {
        return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(artist);
});

// Create new artist
app.post('/api/artists', upload.single('image'), (req, res) => {
    const artists = getArtists();
    
    const newArtist = {
        id: Date.now().toString(),
        name: req.body.name || '',
        bio: req.body.bio || '',
        image: req.file ? (isVercel ? `/tmp/uploads/${req.file.filename}` : `/uploads/${req.file.filename}`) : req.body.image || '',
        websiteUrl: req.body.websiteUrl || '',
        instagramUrl: req.body.instagramUrl || '',
        soundcloudUrl: req.body.soundcloudUrl || '',
        spotifyUrl: req.body.spotifyUrl || '',
        bandcampUrl: req.body.bandcampUrl || '',
        otherUrl: req.body.otherUrl || '',
        createdAt: new Date().toISOString()
    };
    
    artists.push(newArtist);
    
    if (saveArtists(artists)) {
        res.json(newArtist);
    } else {
        res.status(500).json({ error: 'Failed to save artist' });
    }
});

// Update artist
app.put('/api/artists/:id', upload.single('image'), (req, res) => {
    const artists = getArtists();
    const index = artists.findIndex(a => a.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Artist not found' });
    }
    
    const artist = artists[index];
    
    // Update fields
    artist.name = req.body.name || artist.name;
    artist.bio = req.body.bio || artist.bio;
    artist.websiteUrl = req.body.websiteUrl || artist.websiteUrl;
    artist.instagramUrl = req.body.instagramUrl || artist.instagramUrl;
    artist.soundcloudUrl = req.body.soundcloudUrl || artist.soundcloudUrl;
    artist.spotifyUrl = req.body.spotifyUrl || artist.spotifyUrl;
    artist.bandcampUrl = req.body.bandcampUrl || artist.bandcampUrl;
    artist.otherUrl = req.body.otherUrl || artist.otherUrl;
    
    // Update image if new one uploaded
    if (req.file) {
        // Delete old image if it exists
        if (artist.image && (artist.image.startsWith('/uploads/') || artist.image.startsWith('/tmp/uploads/'))) {
            const oldImagePath = artist.image.startsWith('/tmp/') 
                ? artist.image 
                : path.join(__dirname, artist.image);
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (error) {
                    console.error('Error deleting old image:', error);
                }
            }
        }
        artist.image = isVercel ? `/tmp/uploads/${req.file.filename}` : `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
        artist.image = req.body.image;
    }
    
    artist.updatedAt = new Date().toISOString();
    
    if (saveArtists(artists)) {
        res.json(artist);
    } else {
        res.status(500).json({ error: 'Failed to update artist' });
    }
});

// Delete artist
app.delete('/api/artists/:id', (req, res) => {
    const artists = getArtists();
    const releases = getReleases();
    const index = artists.findIndex(a => a.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Artist not found' });
    }
    
    const artist = artists[index];
    
    // Check if artist has releases
    const artistReleases = releases.filter(r => r.artistId === artist.id);
    if (artistReleases.length > 0) {
        return res.status(400).json({ 
            error: 'Cannot delete artist with existing releases. Delete releases first.' 
        });
    }
    
    // Delete associated image
    if (artist.image && (artist.image.startsWith('/uploads/') || artist.image.startsWith('/tmp/uploads/'))) {
        const imagePath = artist.image.startsWith('/tmp/') 
            ? artist.image 
            : path.join(__dirname, artist.image);
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    }
    
    artists.splice(index, 1);
    
    if (saveArtists(artists)) {
        res.json({ message: 'Artist deleted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to delete artist' });
    }
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

