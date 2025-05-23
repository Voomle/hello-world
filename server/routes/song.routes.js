const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get albumId from parent router
const songModel = require('../models/song.model');
const albumModel = require('../models/album.model'); // To check if album exists
const artistModel = require('../models/artist.model'); // To check if artist exists (for artist_id in song)
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');

// Validation middleware for song data
const songValidationRules = () => [
  body('title', 'Song title is required').notEmpty().trim().escape(),
  body('album_id', 'Album ID is required and must be an integer').isInt({ gt: 0 }),
  body('artist_id', 'Artist ID is required and must be an integer').isInt({ gt: 0 }),
  body('duration_seconds', 'Duration in seconds must be a positive integer').optional().isInt({ gt: 0 }),
  body('track_number', 'Track number must be a positive integer').optional().isInt({ gt: 0 }),
  body('file_url', 'File URL must be a valid URL or empty').optional({ checkFalsy: true }).isURL(),
];

// POST /api/songs - Create a new song (Protected)
// Also handles POST /api/albums/:albumId/songs
router.post(
  '/',
  verifyToken,
  songValidationRules(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { album_id, artist_id } = req.body;
    const { albumId: albumIdFromParams } = req.params; // For /api/albums/:albumId/songs

    if (albumIdFromParams) {
        album_id = parseInt(albumIdFromParams, 10);
        if (isNaN(album_id) || album_id !== req.body.album_id) {
            // If album_id in body is different from param, or param is not a number
            // We could enforce that album_id in body must match param, or just use param.
            // For now, let's prioritize param if present and valid.
            if (req.body.album_id && req.body.album_id !== album_id) {
                 return res.status(400).json({ errors: [{ msg: `album_id in body (${req.body.album_id}) conflicts with URL parameter (${album_id})`}]});
            }
            req.body.album_id = album_id; // Ensure body has the correct album_id
        }
    }


    try {
      // Check if album exists
      const album = await albumModel.getAlbumById(album_id);
      if (!album) {
        return res.status(404).json({ msg: `Album with ID ${album_id} not found.` });
      }

      // Check if artist exists (the one specified in the song's artist_id field)
      const artist = await artistModel.getArtistById(artist_id);
      if (!artist) {
        return res.status(404).json({ msg: `Artist with ID ${artist_id} not found.` });
      }

      // Optional: Check if the song's artist_id matches the album's artist_id
      if (album.artist.id !== artist_id) {
        return res.status(400).json({
          errors: [{
            msg: `The artist ID (${artist_id}) for the song does not match the album's artist ID (${album.artist.id}).`
          }]
        });
      }

      const newSong = await songModel.createSong(req.body);
      res.status(201).json(newSong);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while creating song');
    }
  }
);

// GET /api/songs/:id/playinfo - Get song info for playback and increment play count (Protected)
router.get(
  '/:id/playinfo',
  verifyToken,
  [param('id', 'Invalid song ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const songId = parseInt(req.params.id, 10);

    try {
      const song = await songModel.getSongById(songId);
      if (!song) {
        return res.status(404).json({ msg: 'Song not found' });
      }

      // Increment play count
      const updatedPlays = await songModel.incrementPlayCount(songId);
      if (updatedPlays === null) {
        // This might happen if the song was deleted between getSongById and incrementPlayCount
        // Or if incrementPlayCount itself couldn't find the song.
        console.warn(`Play count for song ID ${songId} could not be updated as song was not found during increment.`);
        // Depending on desired behavior, you might still return song info, or an error.
        // For now, let's assume if getSongById found it, it's okay to proceed,
        // but log a warning if increment fails to return a new play count.
      }

      // Prepare response
      const playInfo = {
        songId: song.id,
        title: song.title,
        artistName: song.artist.name,
        albumTitle: song.album.title,
        coverArtUrl: song.album.cover_image_url, // Ensure this matches model output
        fileUrl: song.file_url,
        plays: updatedPlays !== null ? updatedPlays : song.plays, // Use updated plays, or original if update failed
      };

      res.json(playInfo);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while getting song play information');
    }
  }
);

// GET /api/songs - Get all songs
router.get('/', async (req, res) => {
  try {
    const songs = await songModel.getAllSongs();
    res.json(songs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error while getting songs');
  }
});


// GET /api/albums/:albumId/songs - Get all songs for a specific album
router.get('/albums/:albumId/songs', [
    param('albumId', 'Invalid Album ID').isInt({ gt: 0 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { albumId } = req.params;
    try {
        const album = await albumModel.getAlbumById(albumId);
        if (!album) {
            return res.status(404).json({ msg: `Album with ID ${albumId} not found.` });
        }
        const songs = await songModel.getSongsByAlbumId(albumId);
         if (!songs || songs.length === 0) {
            return res.status(404).json({ msg: `No songs found for album ID ${albumId}.` });
        }
        res.json(songs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error while getting album songs');
    }
});


// GET /api/songs/:id - Get a specific song by ID
router.get(
  '/:id',
  [param('id', 'Invalid song ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const song = await songModel.getSongById(req.params.id);
      if (!song) {
        return res.status(404).json({ msg: 'Song not found' });
      }
      res.json(song);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while getting song');
    }
  }
);

// PUT /api/songs/:id - Update a song (Protected)
router.put(
  '/:id',
  verifyToken,
  [
    param('id', 'Invalid song ID').isInt({ gt: 0 }),
    ...songValidationRules(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { album_id, artist_id } = req.body;
    const songId = req.params.id;

    try {
      // Check if song exists
      let song = await songModel.getSongById(songId);
      if (!song) {
        return res.status(404).json({ msg: 'Song not found' });
      }

      // Check if album exists
      const album = await albumModel.getAlbumById(album_id);
      if (!album) {
        return res.status(404).json({ msg: `Album with ID ${album_id} not found.` });
      }

      // Check if artist exists
      const artist = await artistModel.getArtistById(artist_id);
      if (!artist) {
        return res.status(404).json({ msg: `Artist with ID ${artist_id} not found.` });
      }

      // Optional: Check if the song's new artist_id matches the new album's artist_id
      if (album.artist.id !== artist_id) {
         return res.status(400).json({
          errors: [{
            msg: `The artist ID (${artist_id}) for the song does not match the album's artist ID (${album.artist.id}).`
          }]
        });
      }

      const updatedSong = await songModel.updateSong(songId, req.body);
      res.json(updatedSong);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while updating song');
    }
  }
);

// DELETE /api/songs/:id - Delete a song (Protected)
router.delete(
  '/:id',
  verifyToken,
  [param('id', 'Invalid song ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const song = await songModel.getSongById(req.params.id);
      if (!song) {
        return res.status(404).json({ msg: 'Song not found' });
      }

      const deletedSong = await songModel.deleteSong(req.params.id);
       if (!deletedSong) {
         return res.status(404).json({ msg: 'Song not found or already deleted' });
      }
      res.json({ msg: 'Song deleted successfully', song: deletedSong });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error while deleting song');
    }
  }
);

module.exports = router;
