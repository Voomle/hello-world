const express = require('express');
const router = express.Router();
const songModel = require('../models/song.model');
const artistModel = require('../models/artist.model'); // Import artist model
const albumModel = require('../models/album.model');   // Import album model
const { query, validationResult } = require('express-validator'); // For query parameter validation

// GET /api/search/songs?q=<searchTerm> - Search for songs by title
router.get(
  '/songs',
  [
    query('q', 'Search query (q) is required and must be a non-empty string.')
      .notEmpty()
      .trim()
      .escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchTerm = req.query.q;

    try {
      const songs = await songModel.searchSongsByTitle(searchTerm);
      if (!songs || songs.length === 0) {
        return res.status(404).json({ msg: `No songs found matching "${searchTerm}".`, results: [] });
      }
      res.status(200).json(songs);
    } catch (err) {
      console.error('Error searching songs:', err.message);
      res.status(500).send('Server error while searching songs');
    }
  }
);

// GET /api/search/artists?q=<searchTerm> - Search for artists by name
router.get(
  '/artists',
  [
    query('q', 'Search query (q) is required and must be a non-empty string.')
      .notEmpty()
      .trim()
      .escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchTerm = req.query.q;

    try {
      const artists = await artistModel.searchArtistsByName(searchTerm);
      if (!artists || artists.length === 0) {
        return res.status(404).json({ msg: `No artists found matching "${searchTerm}".`, results: [] });
      }
      res.status(200).json(artists);
    } catch (err) {
      console.error('Error searching artists:', err.message);
      res.status(500).send('Server error while searching artists');
    }
  }
);

// GET /api/search/albums?q=<searchTerm> - Search for albums by title
router.get(
  '/albums',
  [
    query('q', 'Search query (q) is required and must be a non-empty string.')
      .notEmpty()
      .trim()
      .escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchTerm = req.query.q;

    try {
      const albums = await albumModel.searchAlbumsByTitle(searchTerm);
      if (!albums || albums.length === 0) {
        return res.status(404).json({ msg: `No albums found matching "${searchTerm}".`, results: [] });
      }
      res.status(200).json(albums);
    } catch (err) {
      console.error('Error searching albums:', err.message);
      res.status(500).send('Server error while searching albums');
    }
  }
);

module.exports = router;
