// Load and display release page
(function() {
'use strict';

// Get release identifier (slug or ID) from URL
function getReleaseIdentifier() {
    const path = window.location.pathname;
    const match = path.match(/\/release\/([^\/]+)/);
    return match ? match[1] : null;
}

// Extract Spotify ID from URL
function extractSpotifyId(url) {
    const match = url.match(/spotify\.com\/(?:album|track)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Load release data
async function loadReleasePage() {
    const identifier = getReleaseIdentifier();
    console.log('Release identifier:', identifier);
    
    if (!identifier) {
        showError('Release not found');
        return;
    }

    try {
        console.log('Fetching release data...');
        // Load release data (works with both slug and ID)
        const releaseResponse = await fetch(`/api/releases/${identifier}`);
        console.log('Release response status:', releaseResponse.status);
        
        if (!releaseResponse.ok) {
            const errorText = await releaseResponse.text();
            console.error('Release API error:', errorText);
            throw new Error('Release not found');
        }
        const release = await releaseResponse.json();
        console.log('Release loaded:', release);

        // Load artist data
        let artist = null;
        if (release.artistId) {
            const artistResponse = await fetch(`/api/artists/${release.artistId}`);
            if (artistResponse.ok) {
                artist = await artistResponse.json();
            }
        }

        // Render the page
        renderReleasePage(release, artist);
    } catch (error) {
        console.error('Error loading release:', error);
        showError('Error loading release page: ' + error.message);
    }
}

// Update meta tags for SEO and social sharing
function updateMetaTags(release, artist) {
    const baseUrl = window.location.origin;
    const pageUrl = release.slug ? `${baseUrl}/release/${release.slug}` : `${baseUrl}/release/${release.id}`;
    const artistName = artist ? artist.name : 'Unknown Artist';
    const description = release.description 
        ? release.description.substring(0, 160) 
        : `${release.title} by ${artistName} on submerge music label`;
    const title = `${release.title}${artist ? ` by ${artist.name}` : ''} - submerge`;
    
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
    updateMeta('og:type', 'music.album', true);
    updateMeta('og:url', pageUrl, true);
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:site_name', 'submerge', true);
    if (release.image) {
        updateMeta('og:image', release.image, true);
        updateMeta('og:image:width', '1200', true);
        updateMeta('og:image:height', '630', true);
    }
    
    // Twitter tags
    updateMeta('twitter:card', 'summary_large_image', true);
    updateMeta('twitter:url', pageUrl, true);
    updateMeta('twitter:title', title, true);
    updateMeta('twitter:description', description, true);
    if (release.image) {
        updateMeta('twitter:image', release.image, true);
    }
}

function renderReleasePage(release, artist) {
    const container = document.getElementById('release-page');
    if (!container) {
        console.error('Release page container not found');
        return;
    }
    
    console.log('Rendering release page for:', release.title);
    
    // Update meta tags for SEO
    updateMetaTags(release, artist);

    // Build streaming links
    const streamingLinks = [];
    if (release.spotifyUrl) streamingLinks.push({ name: 'Spotify', url: release.spotifyUrl });
    if (release.soundcloudUrl) streamingLinks.push({ name: 'SoundCloud', url: release.soundcloudUrl });
    if (release.bandcampUrl) streamingLinks.push({ name: 'Bandcamp', url: release.bandcampUrl });
    if (release.appleMusicUrl) streamingLinks.push({ name: 'Apple Music', url: release.appleMusicUrl });
    if (release.tidalUrl) streamingLinks.push({ name: 'Tidal', url: release.tidalUrl });
    if (release.youtubeUrl) streamingLinks.push({ name: 'YouTube', url: release.youtubeUrl });
    if (release.otherUrl) streamingLinks.push({ name: 'Other', url: release.otherUrl });

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

    const imageHTML = release.image 
        ? `<img src="${release.image}" alt="${release.title}" class="release-page-image">`
        : '<div class="image-placeholder"></div>';

    const artistLink = artist && artist.slug 
        ? `<a href="/artist/${artist.slug}" class="release-page-artist-link">${artist.name}</a>`
        : artist 
        ? `<a href="/artist/${artist.id}" class="release-page-artist-link">${artist.name}</a>`
        : '';

    container.innerHTML = `
        <section class="release-page-section">
            <div class="release-page-content">
                <div class="release-page-header">
                    <a href="/" class="back-link" onclick="event.preventDefault(); window.location.href='/#releases'; return false;">← back to releases</a>
                    ${imageHTML}
                    <div class="release-page-info">
                        ${artistLink ? `<p class="release-page-artist">${artistLink}</p>` : ''}
                        <h1 class="release-page-title">${release.title || 'Untitled'}</h1>
                        <p class="release-page-date">${release.date || ''}</p>
                        ${release.description && release.description.trim() ? `<div class="release-page-description">${release.description.split('\n\n').map(p => `<p>${p.split('\n').join('<br>')}</p>`).join('')}</div>` : ''}
                        ${streamingLinks.length > 0 ? `
                            <div class="release-page-streaming-links">
                                ${streamingLinks.map(link => `<a href="${link.url}" target="_blank" class="streaming-link">${link.name}</a>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${embedHTML ? `<div class="release-page-preview">${embedHTML}</div>` : ''}
            </div>
        </section>
    `;
}

function showError(message) {
    console.error('Showing error:', message);
    const container = document.getElementById('release-page');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <a href="/" class="back-link" onclick="event.preventDefault(); window.location.href='/#releases'; return false;">← back to releases</a>
            </div>
        `;
    } else {
        console.error('Container not found for error message');
    }
}

// Initialize when DOM is ready
console.log('Initializing release page...');
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, starting release page load...');
        loadReleasePage();
    });
} else {
    console.log('DOM already ready, starting release page load...');
    setTimeout(loadReleasePage, 100);
}

})();

