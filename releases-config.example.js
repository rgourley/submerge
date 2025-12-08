// Example configuration for releases
// Copy this to releases.js and add your actual release URLs

const releases = [
    // SoundCloud releases (no authentication needed)
    {
        type: 'soundcloud',
        url: 'https://soundcloud.com/artist-name/track-name'
    },
    {
        type: 'soundcloud',
        url: 'https://soundcloud.com/another-artist/another-track'
    },
    
    // Spotify releases (basic embed, for full metadata you need API credentials)
    {
        type: 'spotify',
        url: 'https://open.spotify.com/album/album-id-here'
    },
    {
        type: 'spotify',
        url: 'https://open.spotify.com/track/track-id-here'
    },
    
    // Manual entries (if you want to add releases manually)
    {
        type: 'manual',
        artist: 'Artist Name',
        title: 'Release Title',
        date: '2024',
        image: 'path/to/image.jpg',
        url: 'https://link-to-release.com'
    }
];

