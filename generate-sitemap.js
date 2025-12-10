// Script to generate sitemap with dynamic artist pages
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

async function generateSitemap() {
    try {
        // Get all artists
        const artistsResult = await pool.query('SELECT slug, name, "updatedAt" FROM artists WHERE slug IS NOT NULL ORDER BY name');
        const artists = artistsResult.rows;
        
        const baseUrl = 'https://submergemusic.com';
        const now = new Date().toISOString().split('T')[0];
        
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#releases</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#artists</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#about</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/#contact</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

        // Add artist pages
        for (const artist of artists) {
            const lastmod = artist.updatedAt 
                ? new Date(artist.updatedAt).toISOString().split('T')[0]
                : now;
            sitemap += `
  <url>
    <loc>${baseUrl}/artist/${artist.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        }
        
        sitemap += `
</urlset>`;
        
        fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);
        console.log(`✅ Sitemap generated with ${artists.length} artist pages`);
        
    } catch (error) {
        console.error('Error generating sitemap:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

generateSitemap();

