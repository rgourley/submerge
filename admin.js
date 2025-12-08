const RELEASES_API = '/api/releases';
const ARTISTS_API = '/api/artists';
let currentReleaseId = null;
let currentArtistId = null;
let artists = [];
let releases = [];

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadArtists().then(() => {
        loadReleases();
        populateArtistDropdowns();
    });
});

// ========== TAB SWITCHING ==========
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
    // Show/hide tabs
    document.getElementById('releasesTab').style.display = tab === 'releases' ? 'flex' : 'none';
    document.getElementById('artistsTab').style.display = tab === 'artists' ? 'flex' : 'none';
    
    // Set active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase() === tab) {
            btn.classList.add('active');
        }
    });
}

// ========== ARTIST MANAGEMENT ==========

// Load all artists
async function loadArtists() {
    try {
        const response = await fetch(ARTISTS_API);
        artists = await response.json();
        displayArtists(artists);
        populateArtistDropdowns();
    } catch (error) {
        console.error('Error loading artists:', error);
    }
}

// Display artists in sidebar
function displayArtists(artistsList) {
    const list = document.getElementById('artistsList');
    if (!list) return;
    
    list.innerHTML = '';

    if (artistsList.length === 0) {
        list.innerHTML = '<p style="color: var(--accent-color); font-size: 0.75rem;">no artists yet</p>';
        return;
    }

    artistsList.forEach(artist => {
        const item = document.createElement('div');
        item.className = 'artist-item';
        item.innerHTML = `<div class="artist-item-name">${artist.name}</div>`;
        item.addEventListener('click', () => editArtist(artist));
        list.appendChild(item);
    });
}

// Populate artist dropdowns
function populateArtistDropdowns() {
    const selects = ['artistId', 'editArtistId'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Keep first option (select artist)
        const firstOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        
        artists.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist.id;
            option.textContent = artist.name;
            select.appendChild(option);
        });
    });
}

// Show add artist form
function showAddArtistForm() {
    document.getElementById('addArtistForm').style.display = 'block';
    document.getElementById('editArtistForm').style.display = 'none';
    document.getElementById('emptyArtistState').style.display = 'none';
    document.getElementById('artistForm').reset();
    currentArtistId = null;
}

// Hide artist form
function hideArtistForm() {
    document.getElementById('addArtistForm').style.display = 'none';
    document.getElementById('emptyArtistState').style.display = 'block';
}

// Show edit artist form
function editArtist(artist) {
    currentArtistId = artist.id;
    
    // Update active state
    document.querySelectorAll('.artist-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Populate form
    document.getElementById('editArtistId').value = artist.id;
    document.getElementById('editArtistName').value = artist.name || '';
    document.getElementById('editArtistBio').value = artist.bio || '';
    document.getElementById('editArtistWebsiteUrl').value = artist.websiteUrl || '';
    document.getElementById('editArtistInstagramUrl').value = artist.instagramUrl || '';
    document.getElementById('editArtistSoundcloudUrl').value = artist.soundcloudUrl || '';
    document.getElementById('editArtistSpotifyUrl').value = artist.spotifyUrl || '';
    document.getElementById('editArtistBandcampUrl').value = artist.bandcampUrl || '';
    document.getElementById('editArtistOtherUrl').value = artist.otherUrl || '';
    document.getElementById('editArtistImageUrl').value = artist.image && !artist.image.startsWith('/uploads/') ? artist.image : '';
    
    // Show current image
    const preview = document.getElementById('currentArtistImagePreview');
    if (artist.image) {
        preview.innerHTML = `<img src="${artist.image}" alt="${artist.name}">`;
    } else {
        preview.innerHTML = '';
    }
    
    document.getElementById('addArtistForm').style.display = 'none';
    document.getElementById('editArtistForm').style.display = 'block';
    document.getElementById('emptyArtistState').style.display = 'none';
}

// Hide edit artist form
function hideEditArtistForm() {
    document.getElementById('editArtistForm').style.display = 'none';
    document.getElementById('emptyArtistState').style.display = 'block';
    currentArtistId = null;
}

// Handle add artist form submission
document.getElementById('artistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('artistName').value);
    formData.append('bio', document.getElementById('artistBio').value);
    
    const imageFile = document.getElementById('artistImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    } else if (document.getElementById('artistImageUrl').value) {
        formData.append('image', document.getElementById('artistImageUrl').value);
    }
    
    formData.append('websiteUrl', document.getElementById('artistWebsiteUrl').value);
    formData.append('instagramUrl', document.getElementById('artistInstagramUrl').value);
    formData.append('soundcloudUrl', document.getElementById('artistSoundcloudUrl').value);
    formData.append('spotifyUrl', document.getElementById('artistSpotifyUrl').value);
    formData.append('bandcampUrl', document.getElementById('artistBandcampUrl').value);
    formData.append('otherUrl', document.getElementById('artistOtherUrl').value);
    
    try {
        const response = await fetch(ARTISTS_API, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showMessage('Artist added successfully', 'success');
            document.getElementById('artistForm').reset();
            await loadArtists();
            hideArtistForm();
        } else {
            showMessage('Error adding artist', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error adding artist', 'error');
    }
});

// Handle edit artist form submission
document.getElementById('editArtistFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentArtistId) return;
    
    const formData = new FormData();
    formData.append('name', document.getElementById('editArtistName').value);
    formData.append('bio', document.getElementById('editArtistBio').value);
    
    const imageFile = document.getElementById('editArtistImageFile').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    } else if (document.getElementById('editArtistImageUrl').value) {
        formData.append('image', document.getElementById('editArtistImageUrl').value);
    }
    
    formData.append('websiteUrl', document.getElementById('editArtistWebsiteUrl').value);
    formData.append('instagramUrl', document.getElementById('editArtistInstagramUrl').value);
    formData.append('soundcloudUrl', document.getElementById('editArtistSoundcloudUrl').value);
    formData.append('spotifyUrl', document.getElementById('editArtistSpotifyUrl').value);
    formData.append('bandcampUrl', document.getElementById('editArtistBandcampUrl').value);
    formData.append('otherUrl', document.getElementById('editArtistOtherUrl').value);
    
    try {
        const response = await fetch(`${ARTISTS_API}/${currentArtistId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            showMessage('Artist updated successfully', 'success');
            await loadArtists();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error updating artist', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error updating artist', 'error');
    }
});

// Delete artist
async function deleteArtist() {
    if (!currentArtistId) return;
    
    if (!confirm('Are you sure you want to delete this artist?')) {
        return;
    }
    
    try {
        const response = await fetch(`${ARTISTS_API}/${currentArtistId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Artist deleted successfully', 'success');
            await loadArtists();
            hideEditArtistForm();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error deleting artist', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error deleting artist', 'error');
    }
}

// ========== RELEASE MANAGEMENT ==========

// Load all releases
async function loadReleases() {
    try {
        const response = await fetch(RELEASES_API);
        releases = await response.json();
        displayReleases(releases);
    } catch (error) {
        console.error('Error loading releases:', error);
    }
}

// Display releases in sidebar
function displayReleases(releasesList) {
    const list = document.getElementById('releasesList');
    if (!list) return;
    
    list.innerHTML = '';

    if (releasesList.length === 0) {
        list.innerHTML = '<p style="color: var(--accent-color); font-size: 0.75rem;">no releases yet</p>';
        return;
    }

    releasesList.forEach(release => {
        const artist = artists.find(a => a.id === release.artistId);
        const artistName = artist ? artist.name : 'Unknown Artist';
        
        const item = document.createElement('div');
        item.className = 'release-item';
        item.innerHTML = `
            <div class="release-item-title">${release.title}</div>
            <div class="release-item-artist">${artistName}</div>
        `;
        item.addEventListener('click', () => editRelease(release));
        list.appendChild(item);
    });
}

// Show add release form
function showAddReleaseForm() {
    document.getElementById('addForm').style.display = 'block';
    document.getElementById('editForm').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('releaseForm').reset();
    currentReleaseId = null;
    populateArtistDropdowns();
}

// Hide add form
function hideForm() {
    document.getElementById('addForm').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
}

// Show edit form
function editRelease(release) {
    currentReleaseId = release.id;
    
    // Update active state
    document.querySelectorAll('.release-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Populate form
    document.getElementById('editId').value = release.id;
    document.getElementById('editArtistId').value = release.artistId || '';
    document.getElementById('editTitle').value = release.title || '';
    document.getElementById('editDate').value = release.date || '';
    document.getElementById('editSpotifyUrl').value = release.spotifyUrl || '';
    document.getElementById('editSoundcloudUrl').value = release.soundcloudUrl || '';
    document.getElementById('editBandcampUrl').value = release.bandcampUrl || '';
    document.getElementById('editAppleMusicUrl').value = release.appleMusicUrl || '';
    document.getElementById('editYoutubeUrl').value = release.youtubeUrl || '';
    document.getElementById('editOtherUrl').value = release.otherUrl || '';
    document.getElementById('editImageUrl').value = release.image && !release.image.startsWith('/uploads/') ? release.image : '';
    
    // Show current image
    const preview = document.getElementById('currentImagePreview');
    if (release.image) {
        preview.innerHTML = `<img src="${release.image}" alt="${release.title}">`;
    } else {
        preview.innerHTML = '';
    }
    
    document.getElementById('addForm').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    populateArtistDropdowns();
}

// Hide edit form
function hideEditForm() {
    document.getElementById('editForm').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    currentReleaseId = null;
}

// Handle add form submission
document.getElementById('releaseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('artistId', document.getElementById('artistId').value);
    formData.append('title', document.getElementById('title').value);
    formData.append('date', document.getElementById('date').value);
    
    const imageFile = document.getElementById('image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    } else if (document.getElementById('imageUrl').value) {
        formData.append('image', document.getElementById('imageUrl').value);
    }
    
    formData.append('spotifyUrl', document.getElementById('spotifyUrl').value);
    formData.append('soundcloudUrl', document.getElementById('soundcloudUrl').value);
    formData.append('bandcampUrl', document.getElementById('bandcampUrl').value);
    formData.append('appleMusicUrl', document.getElementById('appleMusicUrl').value);
    formData.append('youtubeUrl', document.getElementById('youtubeUrl').value);
    formData.append('otherUrl', document.getElementById('otherUrl').value);
    
    try {
        const response = await fetch(RELEASES_API, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showMessage('Release added successfully', 'success');
            document.getElementById('releaseForm').reset();
            await loadReleases();
            hideForm();
        } else {
            showMessage('Error adding release', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error adding release', 'error');
    }
});

// Handle edit form submission
document.getElementById('editReleaseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentReleaseId) return;
    
    const formData = new FormData();
    formData.append('artistId', document.getElementById('editArtistId').value);
    formData.append('title', document.getElementById('editTitle').value);
    formData.append('date', document.getElementById('editDate').value);
    
    const imageFile = document.getElementById('editImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    } else if (document.getElementById('editImageUrl').value) {
        formData.append('image', document.getElementById('editImageUrl').value);
    }
    
    formData.append('spotifyUrl', document.getElementById('editSpotifyUrl').value);
    formData.append('soundcloudUrl', document.getElementById('editSoundcloudUrl').value);
    formData.append('bandcampUrl', document.getElementById('editBandcampUrl').value);
    formData.append('appleMusicUrl', document.getElementById('editAppleMusicUrl').value);
    formData.append('youtubeUrl', document.getElementById('editYoutubeUrl').value);
    formData.append('otherUrl', document.getElementById('editOtherUrl').value);
    
    try {
        const response = await fetch(`${RELEASES_API}/${currentReleaseId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            showMessage('Release updated successfully', 'success');
            await loadReleases();
        } else {
            showMessage('Error updating release', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error updating release', 'error');
    }
});

// Delete release
async function deleteRelease() {
    if (!currentReleaseId) return;
    
    if (!confirm('Are you sure you want to delete this release?')) {
        return;
    }
    
    try {
        const response = await fetch(`${RELEASES_API}/${currentReleaseId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Release deleted successfully', 'success');
            await loadReleases();
            hideEditForm();
        } else {
            showMessage('Error deleting release', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error deleting release', 'error');
    }
}

// Show message
function showMessage(text, type) {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    const container = document.querySelector('.admin-main');
    if (!container) return;
    
    const firstChild = container.firstChild;
    if (firstChild) {
        container.insertBefore(message, firstChild);
    } else {
        container.appendChild(message);
    }
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}
