// Fetch artists from API and render them
// Use IIFE to avoid variable conflicts with releases.js
(function() {
'use strict';

const ARTISTS_API = '/api/artists';

// Render artists to the page
async function renderArtists() {
    const artistsGrid = document.querySelector('.artists-grid');
    if (!artistsGrid) {
        console.error('Artists grid not found');
        return;
    }
    
    try {
        console.log('Fetching artists from API...');
        const response = await fetch(ARTISTS_API);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const artists = await response.json();
        console.log('Artists loaded:', artists);
        
        // Clear existing placeholder artists
        artistsGrid.innerHTML = '';
        
        if (artists.length === 0) {
            artistsGrid.innerHTML = '<p style="color: var(--accent-color); font-size: 0.875rem; grid-column: 1 / -1;">No artists yet. Add artists in the admin panel.</p>';
            return;
        }
        
        for (const artist of artists) {
            const artistCard = createArtistCard(artist);
            artistsGrid.appendChild(artistCard);
            
            // Trigger animation after a brief delay
            setTimeout(() => {
                artistCard.style.opacity = '1';
                artistCard.style.transform = 'translateY(0)';
            }, 100);
        }
        
        console.log(`✓ Rendered ${artists.length} artist(s)`);
    } catch (error) {
        console.error('✗ Error loading artists:', error);
        artistsGrid.innerHTML = '<p style="color: var(--accent-color); font-size: 0.875rem; grid-column: 1 / -1;">Error loading artists. Check console for details.</p>';
    }
}

function createArtistCard(artist) {
    const card = document.createElement('div');
    card.className = 'artist-card';
    
    // Set initial state for animation
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    
    const imageHTML = artist.image 
        ? `<img src="${artist.image}" alt="${artist.name}" class="artist-image-img">`
        : '<div class="image-placeholder"></div>';
    
    card.innerHTML = `
        <div class="artist-image">
            ${imageHTML}
        </div>
        <p class="artist-name">${artist.name || 'Unknown Artist'}</p>
    `;
    
    // Add click handler to navigate to artist page (use slug if available, fallback to ID)
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        const url = artist.slug ? `/artist/${artist.slug}` : `/artist/${artist.id}`;
        window.location.href = url;
    });
    
    return card;
}

function openArtistModal(artist) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'release-modal';
    
    // Build links
    const links = [];
    if (artist.websiteUrl) links.push({ name: 'Website', url: artist.websiteUrl });
    if (artist.instagramUrl) links.push({ name: 'Instagram', url: artist.instagramUrl });
    if (artist.soundcloudUrl) links.push({ name: 'SoundCloud', url: artist.soundcloudUrl });
    if (artist.spotifyUrl) links.push({ name: 'Spotify', url: artist.spotifyUrl });
    if (artist.bandcampUrl) links.push({ name: 'Bandcamp', url: artist.bandcampUrl });
    if (artist.otherUrl) links.push({ name: 'Other', url: artist.otherUrl });
    
    const linksHTML = links.length > 0
        ? `<div class="release-modal-links">
            ${links.map(link => `<a href="${link.url}" target="_blank" class="streaming-link">${link.name}</a>`).join('')}
           </div>`
        : '';
    
    modal.innerHTML = `
        <div class="release-modal-content">
            <button class="release-modal-close">&times;</button>
            <div class="release-modal-header">
                <h2 class="release-modal-title">${artist.name || 'Unknown Artist'}</h2>
            </div>
            ${artist.image ? `<div class="artist-modal-image"><img src="${artist.image}" alt="${artist.name}"></div>` : ''}
            ${artist.bio ? `<div class="artist-modal-bio"><p>${artist.bio}</p></div>` : ''}
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

// Make function available globally for debugging
window.renderArtists = renderArtists;

// Initialize - run after page loads
function init() {
    // Wait for everything to be ready
    function waitForElement() {
        const artistsGrid = document.querySelector('.artists-grid');
        if (artistsGrid) {
            console.log('✓ Artists grid found');
            renderArtists();
        } else {
            console.log('Waiting for artists grid...');
            requestAnimationFrame(waitForElement);
        }
    }
    
    // Start checking once DOM is interactive
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(waitForElement, 100);
        });
    } else {
        // DOM already ready
        setTimeout(waitForElement, 100);
    }
    
    // Also try on window load as backup
    window.addEventListener('load', () => {
        setTimeout(() => {
            const artistsGrid = document.querySelector('.artists-grid');
            if (artistsGrid && artistsGrid.children.length === 0) {
                console.log('Window loaded, rendering artists...');
                renderArtists();
            }
        }, 200);
    });
}

// Start initialization
init();

})(); // End IIFE
