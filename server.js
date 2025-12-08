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
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
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

// Data file paths
const releasesFile = path.join(__dirname, 'data', 'releases.json');
const artistsFile = path.join(__dirname, 'data', 'artists.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files if they don't exist
if (!fs.existsSync(releasesFile)) {
    fs.writeFileSync(releasesFile, JSON.stringify([], null, 2));
}
if (!fs.existsSync(artistsFile)) {
    fs.writeFileSync(artistsFile, JSON.stringify([], null, 2));
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
        image: req.file ? `/uploads/${req.file.filename}` : req.body.image || '',
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
        if (release.image && release.image.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, release.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        release.image = `/uploads/${req.file.filename}`;
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
    if (release.image && release.image.startsWith('/uploads/')) {
        const imagePath = path.join(__dirname, release.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
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
        image: req.file ? `/uploads/${req.file.filename}` : req.body.image || '',
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
        if (artist.image && artist.image.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, artist.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        artist.image = `/uploads/${req.file.filename}`;
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
    if (artist.image && artist.image.startsWith('/uploads/')) {
        const imagePath = path.join(__dirname, artist.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
    
    artists.splice(index, 1);
    
    if (saveArtists(artists)) {
        res.json({ message: 'Artist deleted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to delete artist' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

