// Migration script to import local JSON data into Neon Postgres
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: POSTGRES_URL or DATABASE_URL environment variable not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Connecting to database...');
        
        // Initialize tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS releases (
                id TEXT PRIMARY KEY,
                "artistId" TEXT,
                title TEXT,
                date TEXT,
                image TEXT,
                "spotifyUrl" TEXT,
                "soundcloudUrl" TEXT,
                "bandcampUrl" TEXT,
                "appleMusicUrl" TEXT,
                "youtubeUrl" TEXT,
                "otherUrl" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS artists (
                id TEXT PRIMARY KEY,
                name TEXT,
                bio TEXT,
                image TEXT,
                "websiteUrl" TEXT,
                "instagramUrl" TEXT,
                "soundcloudUrl" TEXT,
                "spotifyUrl" TEXT,
                "bandcampUrl" TEXT,
                "otherUrl" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP
            )
        `);
        
        console.log('Tables created/verified');
        
        // Read local JSON files
        const artistsFile = path.join(__dirname, 'data', 'artists.json');
        const releasesFile = path.join(__dirname, 'data', 'releases.json');
        
        if (!fs.existsSync(artistsFile)) {
            console.error('Error: artists.json not found');
            process.exit(1);
        }
        
        if (!fs.existsSync(releasesFile)) {
            console.error('Error: releases.json not found');
            process.exit(1);
        }
        
        const artists = JSON.parse(fs.readFileSync(artistsFile, 'utf8'));
        const releases = JSON.parse(fs.readFileSync(releasesFile, 'utf8'));
        
        console.log(`Found ${artists.length} artists and ${releases.length} releases`);
        
        // Migrate artists
        console.log('Migrating artists...');
        for (const artist of artists) {
            const query = `
                INSERT INTO artists (id, name, bio, image, "websiteUrl", "instagramUrl", "soundcloudUrl", "spotifyUrl", "bandcampUrl", "otherUrl", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) 
                DO UPDATE SET 
                    name = EXCLUDED.name,
                    bio = EXCLUDED.bio,
                    image = EXCLUDED.image,
                    "websiteUrl" = EXCLUDED."websiteUrl",
                    "instagramUrl" = EXCLUDED."instagramUrl",
                    "soundcloudUrl" = EXCLUDED."soundcloudUrl",
                    "spotifyUrl" = EXCLUDED."spotifyUrl",
                    "bandcampUrl" = EXCLUDED."bandcampUrl",
                    "otherUrl" = EXCLUDED."otherUrl",
                    "updatedAt" = EXCLUDED."updatedAt"
            `;
            
            await pool.query(query, [
                artist.id,
                artist.name || '',
                artist.bio || '',
                artist.image || '',
                artist.websiteUrl || '',
                artist.instagramUrl || '',
                artist.soundcloudUrl || '',
                artist.spotifyUrl || '',
                artist.bandcampUrl || '',
                artist.otherUrl || '',
                artist.createdAt ? new Date(artist.createdAt) : new Date(),
                artist.updatedAt ? new Date(artist.updatedAt) : null
            ]);
        }
        console.log(`✓ Migrated ${artists.length} artists`);
        
        // Migrate releases
        console.log('Migrating releases...');
        for (const release of releases) {
            const query = `
                INSERT INTO releases (id, "artistId", title, date, image, "spotifyUrl", "soundcloudUrl", "bandcampUrl", "appleMusicUrl", "youtubeUrl", "otherUrl", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id) 
                DO UPDATE SET 
                    "artistId" = EXCLUDED."artistId",
                    title = EXCLUDED.title,
                    date = EXCLUDED.date,
                    image = EXCLUDED.image,
                    "spotifyUrl" = EXCLUDED."spotifyUrl",
                    "soundcloudUrl" = EXCLUDED."soundcloudUrl",
                    "bandcampUrl" = EXCLUDED."bandcampUrl",
                    "appleMusicUrl" = EXCLUDED."appleMusicUrl",
                    "youtubeUrl" = EXCLUDED."youtubeUrl",
                    "otherUrl" = EXCLUDED."otherUrl",
                    "updatedAt" = EXCLUDED."updatedAt"
            `;
            
            await pool.query(query, [
                release.id,
                release.artistId || release.artist || '',
                release.title || '',
                release.date || '',
                release.image || '',
                release.spotifyUrl || '',
                release.soundcloudUrl || '',
                release.bandcampUrl || '',
                release.appleMusicUrl || '',
                release.youtubeUrl || '',
                release.otherUrl || '',
                release.createdAt ? new Date(release.createdAt) : new Date(),
                release.updatedAt ? new Date(release.updatedAt) : null
            ]);
        }
        console.log(`✓ Migrated ${releases.length} releases`);
        
        console.log('\n✅ Migration complete!');
        console.log(`   Artists: ${artists.length}`);
        console.log(`   Releases: ${releases.length}`);
        
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();

