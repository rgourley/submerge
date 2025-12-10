// Migration script to generate slugs for existing artists
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: POSTGRES_URL or DATABASE_URL environment variable not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Generate SEO-friendly slug from name
function generateSlug(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Ensure unique slug
async function ensureUniqueSlug(slug, excludeId) {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
        const result = await pool.query('SELECT id FROM artists WHERE slug = $1 AND id != $2', [uniqueSlug, excludeId]);
        
        if (result.rows.length === 0) {
            return uniqueSlug;
        }
        
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
}

async function migrateSlugs() {
    try {
        console.log('Adding slug column if it doesn\'t exist...');
        await pool.query('ALTER TABLE artists ADD COLUMN IF NOT EXISTS slug TEXT');
        
        console.log('Fetching all artists...');
        const result = await pool.query('SELECT * FROM artists');
        const artists = result.rows;
        
        console.log(`Found ${artists.length} artists`);
        
        for (const artist of artists) {
            if (!artist.slug && artist.name) {
                const slug = generateSlug(artist.name);
                if (slug) {
                    const uniqueSlug = await ensureUniqueSlug(slug, artist.id);
                    await pool.query('UPDATE artists SET slug = $1 WHERE id = $2', [uniqueSlug, artist.id]);
                    console.log(`✓ Updated ${artist.name} -> ${uniqueSlug}`);
                }
            } else if (artist.slug) {
                console.log(`- ${artist.name} already has slug: ${artist.slug}`);
            }
        }
        
        console.log('\n✅ Slug migration complete!');
        
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrateSlugs();

