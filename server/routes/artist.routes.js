const express = require('express');
const router = express.Router();
const artistModel = require('../models/artist.model');
const { body, validationResult, param } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');

// POST /api/artists - Create a new artist (Protected)
router.post(
  '/',
  verifyToken,
  [
    body('name', 'Artist name is required').notEmpty().trim().escape(),
    body('bio', 'Bio can be a string or empty').optional().isString().trim().escape(),
    body('image_url', 'Image URL must be a valid URL or empty').optional({ checkFalsy: true }).isURL(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newArtist = await artistModel.createArtist(req.body);
      res.status(201).json(newArtist);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while creating artist');
    }
  }
);

// GET /api/artists - Get all artists
router.get('/', async (req, res) => {
  try {
    const artists = await artistModel.getAllArtists();
    res.json(artists);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error while getting artists');
  }
});

// GET /api/artists/:id - Get a specific artist by ID
router.get(
  '/:id',
  [param('id', 'Invalid artist ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const artist = await artistModel.getArtistById(req.params.id);
      if (!artist) {
        return res.status(404).json({ msg: 'Artist not found' });
      }
      res.json(artist);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while getting artist');
    }
  }
);

// PUT /api/artists/:id - Update an artist (Protected)
router.put(
  '/:id',
  verifyToken,
  [
    param('id', 'Invalid artist ID').isInt({ gt: 0 }),
    body('name', 'Artist name is required').notEmpty().trim().escape(),
    body('bio', 'Bio can be a string or empty').optional().isString().trim().escape(),
    body('image_url', 'Image URL must be a valid URL or empty').optional({ checkFalsy: true }).isURL(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let artist = await artistModel.getArtistById(req.params.id);
      if (!artist) {
        return res.status(404).json({ msg: 'Artist not found' });
      }

      const updatedArtist = await artistModel.updateArtist(req.params.id, req.body);
      res.json(updatedArtist);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while updating artist');
    }
  }
);

// DELETE /api/artists/:id - Delete an artist (Protected)
router.delete(
  '/:id',
  verifyToken,
  [param('id', 'Invalid artist ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const artist = await artistModel.getArtistById(req.params.id);
      if (!artist) {
        return res.status(404).json({ msg: 'Artist not found' });
      }

      const deletedArtist = await artistModel.deleteArtist(req.params.id);
      if (!deletedArtist) { // Should not happen if artist was found, but good practice
        return res.status(404).json({ msg: 'Artist not found or already deleted' });
      }
      res.json({ msg: 'Artist deleted successfully', artist: deletedArtist });
    } catch (err) {
      console.error(err.message);
      // Handle potential foreign key constraint errors (e.g., artist has albums)
      if (err.code === '23503') { // PostgreSQL foreign key violation error code
        return res.status(409).json({ msg: 'Cannot delete artist: They may have associated albums or songs. Please delete them first.' });
      }
      res.status(500).send('Server error while deleting artist');
    }
  }
);

module.exports = router;
