// Fetch releases from API and render them
const RELEASES_API = '/api/releases';
const ARTISTS_API = '/api/artists';

let artists = [];

// Load artists first
async function loadArtists() {
    try {
        const response = await fetch(ARTISTS_API);
        artists = await response.json();
    } catch (error) {
        console.error('Error loading artists:', error);
    }
}

// Get artist name by ID
function getArtistName(artistId) {
    const artist = artists.find(a => a.id === artistId);
    return artist ? artist.name : 'Unknown Artist';
}

// Render releases to the page
async function renderReleases() {
    const releasesGrid = document.querySelector('.releases-grid');
    if (!releasesGrid) return;
    
    try {
        // Load artists first
        await loadArtists();
        
        const response = await fetch(RELEASES_API);
        const releases = await response.json();
        
        // Clear existing placeholder releases
        releasesGrid.innerHTML = '';
        
        if (releases.length === 0) {
            releasesGrid.innerHTML = '<p style="color: var(--accent-color); font-size: 0.875rem; grid-column: 1 / -1;">No releases yet. Add releases in the admin panel.</p>';
            return;
        }
        
        // Sort by date (newest first)
        releases.sort((a, b) => {
            const dateA = parseInt(a.date) || 0;
            const dateB = parseInt(b.date) || 0;
            return dateB - dateA;
        });
        
        for (const release of releases) {
            const releaseCard = createReleaseCard(release);
            releasesGrid.appendChild(releaseCard);
        }
    } catch (error) {
        console.error('Error loading releases:', error);
        releasesGrid.innerHTML = '<p style="color: var(--accent-color); font-size: 0.875rem; grid-column: 1 / -1;">Error loading releases.</p>';
    }
}

function createReleaseCard(release) {
    const card = document.createElement('div');
    card.className = 'release-card';
    
    const imageHTML = release.image 
        ? `<img src="${release.image}" alt="${release.title}" class="release-image-img">`
        : '<div class="image-placeholder"></div>';
    
    const artistName = getArtistName(release.artistId);
    
    card.innerHTML = `
        <div class="release-image">
            ${imageHTML}
        </div>
        <div class="release-info">
            <p class="release-artist">${artistName}</p>
            <p class="release-title">${release.title || 'Untitled'}</p>
            <p class="release-date">${release.date || new Date().getFullYear()}</p>
        </div>
    `;
    
    // Add click handler to show release modal with streaming links
    card.style.cursor = 'pointer';
    card.addEventListener('click', async () => {
        await openReleaseModal(release);
    });
    
    return card;
}

async function openReleaseModal(release) {
    // Ensure artists are loaded
    if (artists.length === 0) {
        await loadArtists();
    }
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'release-modal';
    
    // Build streaming links
    const links = [];
    if (release.spotifyUrl) links.push({ name: 'Spotify', url: release.spotifyUrl });
    if (release.soundcloudUrl) links.push({ name: 'SoundCloud', url: release.soundcloudUrl });
    if (release.bandcampUrl) links.push({ name: 'Bandcamp', url: release.bandcampUrl });
    if (release.appleMusicUrl) links.push({ name: 'Apple Music', url: release.appleMusicUrl });
    if (release.tidalUrl) links.push({ name: 'Tidal', url: release.tidalUrl });
    if (release.youtubeUrl) links.push({ name: 'YouTube', url: release.youtubeUrl });
    if (release.otherUrl) links.push({ name: 'Listen', url: release.otherUrl });
    
    const linksHTML = links.length > 0
        ? `<div class="release-modal-links">
            ${links.map(link => `<a href="${link.url}" target="_blank" class="streaming-link">${link.name}</a>`).join('')}
           </div>`
        : '';
    
    // Create embed - prefer Spotify, fallback to SoundCloud
    let embedHTML = '';
    if (release.spotifyUrl) {
        const spotifyId = extractSpotifyId(release.spotifyUrl);
        if (spotifyId) {
            const type = release.spotifyUrl.includes('/album/') ? 'album' : 'track';
            embedHTML = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/${type}/${spotifyId}?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
        }
    } else if (release.soundcloudUrl) {
        embedHTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(release.soundcloudUrl)}&color=%23888888&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`;
    }
    
    const artistName = getArtistName(release.artistId);
    
    modal.innerHTML = `
        <div class="release-modal-content">
            <button class="release-modal-close">&times;</button>
            <div class="release-modal-header">
                <h3 class="release-modal-artist">${artistName}</h3>
                <h2 class="release-modal-title">${release.title || 'Untitled'}</h2>
                <p class="release-modal-date">${release.date || ''}</p>
            </div>
            ${embedHTML ? `<div class="release-modal-embed">${embedHTML}</div>` : ''}
            ${linksHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    modal.querySelector('.release-modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function extractSpotifyId(url) {
    const match = url.match(/spotify\.com\/(?:album|track)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderReleases);
} else {
    renderReleases();
}
