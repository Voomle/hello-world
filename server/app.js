require('dotenv').config(); // Load environment variables at the very top
const express = require('express');
const authRoutes = require('./routes/auth.routes');
const artistRoutes = require('./routes/artist.routes');
const albumRoutes = require('./routes/album.routes');
const songRoutes = require('./routes/song.routes');
const playlistRoutes = require('./routes/playlist.routes'); // Import playlist routes
const searchRoutes = require('./routes/search.routes'); // Import search routes
const path = require('path'); // Import path module
// Potentially other route imports here in the future

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // To parse JSON request bodies
// app.use(cors()); // Example: if CORS is needed and installed

// Servir les fichiers statiques du front-end (qui seront copiés dans /usr/src/app/public_root)
app.use(express.static(path.join(__dirname, 'public_root')));

// Routes API (montées APRÈS le middleware static)
app.use('/api/auth', authRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes); // General album routes
app.use('/api/songs', songRoutes);   // General song routes
app.use('/api/playlists', playlistRoutes); // Mount playlist routes
app.use('/api/search', searchRoutes); // Mount search routes

// Nested routes - ensure these are correctly handled by the respective route files with mergeParams: true
// For /api/artists/:artistId/albums, this is handled by album.routes.js if it's also mounted at /api/artists
// but it's more common to mount it at /api/albums and have a specific route there, or handle directly.
// My album.routes.js and song.routes.js are set up to handle specific base paths and then look for params.

// Example of how one might explicitly set up nested routes if not using mergeParams extensively or for clarity:
// app.use('/api/artists/:artistId/albums', albumRoutes); // if albumRoutes is designed to handle this
// app.use('/api/albums/:albumId/songs', songRoutes);   // if songRoutes is designed to handle this
// However, my current setup for album.routes.js and song.routes.js already includes routes like:
// router.get('/artists/:artistId/albums', ...) in album.routes.js
// router.get('/albums/:albumId/songs', ...) in song.routes.js
// So, mounting them at their primary resource path (/api/albums, /api/songs) is correct.
// The specific GET routes for nested resources are defined within those files.
// The POST routes for nested resources (e.g. POST /api/albums/:albumId/songs) are also handled within song.routes.js with mergeParams.

// Route catch-all pour servir index.html pour les applications monopages (SPA)
// Doit venir après toutes les routes API.
app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) { // Ne pas interférer avec les appels API
        return next();
    }
    res.sendFile(path.join(__dirname, 'public_root', 'index.html'));
});

// Basic error handling middleware (optional, can be expanded)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
if (process.env.NODE_ENV !== 'test') { // Avoid starting server during tests
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; // Export for potential testing
