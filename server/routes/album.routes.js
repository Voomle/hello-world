const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get artistId from parent router if needed
const albumModel = require('../models/album.model');
const artistModel = require('../models/artist.model'); // To check if artist exists
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');

// Validation middleware for album data
const albumValidationRules = () => [
  body('title', 'Album title is required').notEmpty().trim().escape(),
  body('artist_id', 'Artist ID is required and must be an integer').isInt({ gt: 0 }),
  body('release_date', 'Release date must be a valid date').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('genre', 'Genre can be a string or empty').optional().isString().trim().escape(),
  body('cover_image_url', 'Cover image URL must be a valid URL or empty').optional({ checkFalsy: true }).isURL(),
];

// POST /api/albums - Create a new album (Protected)
// Also handles POST /api/artists/:artistId/albums (if artistId is present in params)
router.post(
  '/',
  verifyToken,
  albumValidationRules(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { artist_id } = req.body;

    try {
      // Check if artist exists
      const artist = await artistModel.getArtistById(artist_id);
      if (!artist) {
        return res.status(404).json({ msg: `Artist with ID ${artist_id} not found.` });
      }

      const newAlbum = await albumModel.createAlbum(req.body);
      res.status(201).json(newAlbum);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while creating album');
    }
  }
);

// GET /api/albums - Get all albums
router.get('/', async (req, res) => {
  try {
    const albums = await albumModel.getAllAlbums();
    res.json(albums);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error while getting albums');
  }
});

// GET /api/artists/:artistId/albums - Get all albums for a specific artist
router.get('/artists/:artistId/albums', [
    param('artistId', 'Invalid Artist ID').isInt({ gt: 0 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { artistId } = req.params;
    try {
        const artist = await artistModel.getArtistById(artistId);
        if (!artist) {
            return res.status(404).json({ msg: `Artist with ID ${artistId} not found.` });
        }
        const albums = await albumModel.getAlbumsByArtistId(artistId);
        if (!albums || albums.length === 0) {
            return res.status(404).json({ msg: `No albums found for artist ID ${artistId}.` });
        }
        res.json(albums);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error while getting artist albums');
    }
});


// GET /api/albums/:id - Get a specific album by ID
router.get(
  '/:id',
  [param('id', 'Invalid album ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const album = await albumModel.getAlbumById(req.params.id);
      if (!album) {
        return res.status(404).json({ msg: 'Album not found' });
      }
      res.json(album);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while getting album');
    }
  }
);


// PUT /api/albums/:id - Update an album (Protected)
router.put(
  '/:id',
  verifyToken,
  [
    param('id', 'Invalid album ID').isInt({ gt: 0 }),
    ...albumValidationRules(), // Spread the validation rules
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { artist_id } = req.body;
    const albumId = req.params.id;

    try {
      // Check if album exists
      let album = await albumModel.getAlbumById(albumId);
      if (!album) {
        return res.status(404).json({ msg: 'Album not found' });
      }

      // Check if artist exists
      const artist = await artistModel.getArtistById(artist_id);
      if (!artist) {
        return res.status(404).json({ msg: `Artist with ID ${artist_id} not found.` });
      }

      const updatedAlbum = await albumModel.updateAlbum(albumId, req.body);
      res.json(updatedAlbum);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while updating album');
    }
  }
);

// DELETE /api/albums/:id - Delete an album (Protected)
router.delete(
  '/:id',
  verifyToken,
  [param('id', 'Invalid album ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const album = await albumModel.getAlbumById(req.params.id);
      if (!album) {
        return res.status(404).json({ msg: 'Album not found' });
      }

      const deletedAlbum = await albumModel.deleteAlbum(req.params.id);
      if (!deletedAlbum) {
         return res.status(404).json({ msg: 'Album not found or already deleted' });
      }
      res.json({ msg: 'Album deleted successfully', album: deletedAlbum });
    } catch (err) {
      console.error(err.message);
       // Handle potential foreign key constraint errors (e.g., album has songs)
      if (err.code === '23503') { // PostgreSQL foreign key violation error code
        return res.status(409).json({ msg: 'Cannot delete album: It may have associated songs. Please delete them first.' });
      }
      res.status(500).send('Server error while deleting album');
    }
  }
);

module.exports = router;
