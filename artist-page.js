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

        // Load releases to find all releases by this artist
        console.log('Fetching releases...');
        const releasesResponse = await fetch('/api/releases');
        const releases = await releasesResponse.json();
        console.log('Releases loaded:', releases);
        
        // Find all releases by this artist, sorted by date (newest first)
        const artistReleases = releases
            .filter(r => r.artistId === artistId)
            .sort((a, b) => {
                const dateA = parseInt(a.date) || 0;
                const dateB = parseInt(b.date) || 0;
                return dateB - dateA;
            });
        
        console.log('Artist releases:', artistReleases);

        // Render the page
        renderArtistPage(artist, artistReleases);
    } catch (error) {
        console.error('Error loading artist:', error);
        showError('Error loading artist page: ' + error.message);
    }
}

// Update meta tags for SEO and social sharing
function updateMetaTags(artist) {
    const baseUrl = window.location.origin;
    const pageUrl = `${baseUrl}/artist/${artist.id}`;
    const description = artist.bio ? artist.bio.substring(0, 160) : `${artist.name} on submerge music label`;
    const title = `${artist.name} - submerge`;
    
    // Update title
    document.title = title;
    
    // Update or create meta tags
    const updateMeta = (name, content, isProperty = false) => {
        const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector);
        if (!meta) {
            meta = document.createElement('meta');
            if (isProperty) {
                meta.setAttribute('property', name);
            } else {
                meta.setAttribute('name', name);
            }
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    };
    
    // Primary meta tags
    updateMeta('title', title);
    updateMeta('description', description);
    updateMeta('robots', 'index, follow');
    
    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', pageUrl);
    
    // Open Graph tags
    updateMeta('og:type', 'profile', true);
    updateMeta('og:url', pageUrl, true);
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:site_name', 'submerge', true);
    if (artist.image) {
        updateMeta('og:image', artist.image, true);
        updateMeta('og:image:width', '1200', true);
        updateMeta('og:image:height', '630', true);
    }
    
    // Twitter tags
    updateMeta('twitter:card', 'summary_large_image', true);
    updateMeta('twitter:url', pageUrl, true);
    updateMeta('twitter:title', title, true);
    updateMeta('twitter:description', description, true);
    if (artist.image) {
        updateMeta('twitter:image', artist.image, true);
    }
}

function renderArtistPage(artist, artistReleases) {
    const container = document.getElementById('artist-page');
    if (!container) {
        console.error('Artist page container not found');
        return;
    }
    
    console.log('Rendering artist page for:', artist.name);
    
    // Update meta tags for SEO
    updateMetaTags(artist);

    // Build social links
    const socialLinks = [];
    if (artist.websiteUrl) socialLinks.push({ name: 'Website', url: artist.websiteUrl });
    if (artist.instagramUrl) socialLinks.push({ name: 'Instagram', url: artist.instagramUrl });
    if (artist.soundcloudUrl) socialLinks.push({ name: 'SoundCloud', url: artist.soundcloudUrl });
    if (artist.spotifyUrl) socialLinks.push({ name: 'Spotify', url: artist.spotifyUrl });
    if (artist.bandcampUrl) socialLinks.push({ name: 'Bandcamp', url: artist.bandcampUrl });
    if (artist.otherUrl) socialLinks.push({ name: 'Other', url: artist.otherUrl });

    const imageHTML = artist.image 
        ? `<img src="${artist.image}" alt="${artist.name}" class="artist-page-image">`
        : '<div class="image-placeholder"></div>';

    const releaseHTML = artistReleases.length > 0
        ? `
            <div class="artist-releases">
                <h3 class="artist-section-title">releases</h3>
                <div class="artist-releases-grid">
                    ${artistReleases.map(release => {
                        const releaseLinks = [];
                        if (release.spotifyUrl) releaseLinks.push({ name: 'Spotify', url: release.spotifyUrl });
                        if (release.soundcloudUrl) releaseLinks.push({ name: 'SoundCloud', url: release.soundcloudUrl });
                        if (release.bandcampUrl) releaseLinks.push({ name: 'Bandcamp', url: release.bandcampUrl });
                        if (release.appleMusicUrl) releaseLinks.push({ name: 'Apple Music', url: release.appleMusicUrl });
                        if (release.youtubeUrl) releaseLinks.push({ name: 'YouTube', url: release.youtubeUrl });
                        if (release.otherUrl) releaseLinks.push({ name: 'Other', url: release.otherUrl });
                        
                        return `
                            <div class="release-card-large">
                                ${release.image ? `<div class="release-image-large"><img src="${release.image}" alt="${release.title}"></div>` : '<div class="release-image-large"><div class="image-placeholder"></div></div>'}
                                <div class="release-info-large">
                                    <p class="release-title-large">${release.title}</p>
                                    <p class="release-date-large">${release.date || ''}</p>
                                    ${releaseLinks.length > 0 ? `
                                        <div class="release-links">
                                            ${releaseLinks.map(link => `<a href="${link.url}" target="_blank" class="streaming-link">${link.name}</a>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
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

