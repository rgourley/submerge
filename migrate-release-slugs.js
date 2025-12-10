// Migration script to generate slugs for existing releases
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

// Generate SEO-friendly slug from title
function generateSlug(title) {
    if (!title) return '';
    return title
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
        const result = await pool.query('SELECT id FROM releases WHERE slug = $1 AND id != $2', [uniqueSlug, excludeId]);
        
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
        await pool.query('ALTER TABLE releases ADD COLUMN IF NOT EXISTS slug TEXT');
        
        console.log('Fetching all releases...');
        const result = await pool.query('SELECT * FROM releases');
        const releases = result.rows;
        
        console.log(`Found ${releases.length} releases`);
        
        for (const release of releases) {
            if (!release.slug && release.title) {
                const slug = generateSlug(release.title);
                if (slug) {
                    const uniqueSlug = await ensureUniqueSlug(slug, release.id);
                    await pool.query('UPDATE releases SET slug = $1 WHERE id = $2', [uniqueSlug, release.id]);
                    console.log(`✓ Updated ${release.title} -> ${uniqueSlug}`);
                }
            } else if (release.slug) {
                console.log(`- ${release.title} already has slug: ${release.slug}`);
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

