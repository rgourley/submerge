// Load and display artist page
(function() {
'use strict';

// Get artist ID from URL
function getArtistId() {
    const path = window.location.pathname;
    const match = path.match(/\/artist\/([^\/]+)/);
    return match ? match[1] : null;
}

// Load artist data
async function loadArtistPage() {
    const artistId = getArtistId();
    console.log('Artist ID:', artistId);
    
    if (!artistId) {
        showError('Artist not found');
        return;
    }

    try {
        console.log('Fetching artist data...');
        // Load artist data
        const artistResponse = await fetch(`/api/artists/${artistId}`);
        console.log('Artist response status:', artistResponse.status);
        
        if (!artistResponse.ok) {
            const errorText = await artistResponse.text();
            console.error('Artist API error:', errorText);
            throw new Error('Artist not found');
        }
        const artist = await artistResponse.json();
        console.log('Artist loaded:', artist);

        // Load releases to find latest
        console.log('Fetching releases...');
        const releasesResponse = await fetch('/api/releases');
        const releases = await releasesResponse.json();
        console.log('Releases loaded:', releases);
        
        // Find latest release by this artist
        const artistReleases = releases
            .filter(r => r.artistId === artistId)
            .sort((a, b) => {
                const dateA = parseInt(a.date) || 0;
                const dateB = parseInt(b.date) || 0;
                return dateB - dateA;
            });
        
        const latestRelease = artistReleases.length > 0 ? artistReleases[0] : null;
        console.log('Latest release:', latestRelease);

        // Render the page
        renderArtistPage(artist, latestRelease);
    } catch (error) {
        console.error('Error loading artist:', error);
        showError('Error loading artist page: ' + error.message);
    }
}

function renderArtistPage(artist, latestRelease) {
    const container = document.getElementById('artist-page');
    if (!container) {
        console.error('Artist page container not found');
        return;
    }
    
    console.log('Rendering artist page for:', artist.name);

    // Build social links
    const socialLinks = [];
    if (artist.websiteUrl) socialLinks.push({ name: 'Website', url: artist.websiteUrl });
    if (artist.instagramUrl) socialLinks.push({ name: 'Instagram', url: artist.instagramUrl });
    if (artist.soundcloudUrl) socialLinks.push({ name: 'SoundCloud', url: artist.soundcloudUrl });
    if (artist.spotifyUrl) socialLinks.push({ name: 'Spotify', url: artist.spotifyUrl });
    if (artist.bandcampUrl) socialLinks.push({ name: 'Bandcamp', url: artist.bandcampUrl });
    if (artist.otherUrl) socialLinks.push({ name: 'Other', url: artist.otherUrl });

    // Build release streaming links
    const releaseLinks = [];
    if (latestRelease) {
        if (latestRelease.spotifyUrl) releaseLinks.push({ name: 'Spotify', url: latestRelease.spotifyUrl });
        if (latestRelease.soundcloudUrl) releaseLinks.push({ name: 'SoundCloud', url: latestRelease.soundcloudUrl });
        if (latestRelease.bandcampUrl) releaseLinks.push({ name: 'Bandcamp', url: latestRelease.bandcampUrl });
        if (latestRelease.appleMusicUrl) releaseLinks.push({ name: 'Apple Music', url: latestRelease.appleMusicUrl });
        if (latestRelease.youtubeUrl) releaseLinks.push({ name: 'YouTube', url: latestRelease.youtubeUrl });
        if (latestRelease.otherUrl) releaseLinks.push({ name: 'Other', url: latestRelease.otherUrl });
    }

    const imageHTML = artist.image 
        ? `<img src="${artist.image}" alt="${artist.name}" class="artist-page-image">`
        : '<div class="image-placeholder"></div>';

    const releaseHTML = latestRelease 
        ? `
            <div class="artist-latest-release">
                <h3 class="artist-section-title">latest release</h3>
                <div class="release-card-large">
                    ${latestRelease.image ? `<div class="release-image-large"><img src="${latestRelease.image}" alt="${latestRelease.title}"></div>` : ''}
                    <div class="release-info-large">
                        <p class="release-title-large">${latestRelease.title}</p>
                        <p class="release-date-large">${latestRelease.date || ''}</p>
                        ${releaseLinks.length > 0 ? `
                            <div class="release-links">
                                ${releaseLinks.map(link => `<a href="${link.url}" target="_blank" class="streaming-link">${link.name}</a>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `
        : '<p class="no-releases">No releases yet.</p>';

    container.innerHTML = `
        <section class="artist-page-section">
            <div class="artist-page-content">
                <div class="artist-page-header">
                    <a href="/#artists" class="back-link">← back to artists</a>
                    ${imageHTML}
                    <div class="artist-page-info">
                        <h1 class="artist-page-name">${artist.name}</h1>
                        ${artist.bio ? `<div class="artist-page-bio">${artist.bio}</div>` : ''}
                        ${socialLinks.length > 0 ? `
                            <div class="artist-social-links">
                                ${socialLinks.map(link => `<a href="${link.url}" target="_blank" class="social-link">${link.name}</a>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${releaseHTML}
            </div>
        </section>
    `;
}

function showError(message) {
    console.error('Showing error:', message);
    const container = document.getElementById('artist-page');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <a href="/#artists" class="back-link">← back to artists</a>
            </div>
        `;
    } else {
        console.error('Container not found for error message');
    }
}

// Initialize when DOM is ready
console.log('Initializing artist page...');
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, starting artist page load...');
        loadArtistPage();
    });
} else {
    console.log('DOM already ready, starting artist page load...');
    setTimeout(loadArtistPage, 100);
}

})();

