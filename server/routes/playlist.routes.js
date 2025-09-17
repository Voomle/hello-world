const express = require('express');
const router = express.Router();
const playlistModel = require('../models/playlist.model');
const { body, param, validationResult } = require('express-validator'); // Added param
const { verifyToken } = require('../middleware/auth.middleware');

// POST /api/playlists - Create a new playlist (Protected)
router.post(
  '/',
  verifyToken,
  [
    body('name', 'Playlist name is required').notEmpty().trim().escape(),
    body('description', 'Description must be a string if provided').optional().isString().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id; 
    const { name, description } = req.body;

    try {
      const newPlaylist = await playlistModel.createPlaylist(userId, name, description);
      res.status(201).json(newPlaylist);
    } catch (err) {
      console.error('Error creating playlist:', err.message);
      res.status(500).send('Server error while creating playlist');
    }
  }
);

// GET /api/playlists - Get all playlists for the authenticated user (Protected)
router.get(
  '/',
  verifyToken,
  async (req, res) => {
    const userId = req.user.id; 

    try {
      const playlists = await playlistModel.getPlaylistsByUserId(userId);
      // getPlaylistsByUserId returns an array, could be empty. No need for 404 if empty.
      res.status(200).json(playlists);
    } catch (err) {
      console.error('Error fetching playlists:', err.message);
      res.status(500).send('Server error while fetching playlists');
    }
  }
);

// GET /api/playlists/:playlistId - Get details of a specific playlist (Protected)
router.get(
  '/:playlistId',
  verifyToken,
  [param('playlistId', 'Invalid Playlist ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const playlistId = parseInt(req.params.playlistId, 10);
    const userId = req.user.id;

    try {
      // Verify ownership first
      const playlistOwnerCheck = await playlistModel.getPlaylistByIdAndUserId(playlistId, userId);
      if (!playlistOwnerCheck) {
        return res.status(403).json({ msg: 'Forbidden: You do not own this playlist or playlist not found.' });
      }

      const playlistDetails = await playlistModel.getPlaylistDetailsById(playlistId);
      if (!playlistDetails) {
        // This case should ideally be covered by owner check, but good for robustness
        return res.status(404).json({ msg: 'Playlist not found.' });
      }
      res.status(200).json(playlistDetails);
    } catch (err) {
      console.error('Error fetching playlist details:', err.message);
      res.status(500).send('Server error while fetching playlist details');
    }
  }
);

// POST /api/playlists/:playlistId/songs - Add a song to a playlist (Protected)
router.post(
  '/:playlistId/songs',
  verifyToken,
  [
    param('playlistId', 'Invalid Playlist ID').isInt({ gt: 0 }),
    body('songId', 'Song ID is required and must be an integer').isInt({ gt: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const playlistId = parseInt(req.params.playlistId, 10);
    const songId = req.body.songId;
    const userId = req.user.id;

    try {
      // Verify playlist ownership
      const playlist = await playlistModel.getPlaylistByIdAndUserId(playlistId, userId);
      if (!playlist) {
        return res.status(403).json({ msg: 'Forbidden: You do not own this playlist or playlist not found.' });
      }

      const result = await playlistModel.addSongToPlaylist(playlistId, songId);
      
      if (result && result.error) {
        if (result.errorCode === 'DUPLICATE_SONG') {
            return res.status(409).json({ msg: result.error }); // 409 Conflict
        }
        if (result.errorCode === 'FK_VIOLATION') {
             return res.status(404).json({ msg: result.error }); // Playlist or Song not found
        }
        return res.status(400).json({ msg: result.error }); // Generic error if other type
      }
      
      // Optionally, fetch song details to return, or just the added association
      res.status(201).json({ msg: 'Song added to playlist successfully', data: result });

    } catch (err) {
      console.error('Error adding song to playlist:', err.message);
      res.status(500).send('Server error while adding song to playlist');
    }
  }
);

// DELETE /api/playlists/:playlistId/songs/:songId - Remove a song from a playlist (Protected)
router.delete(
  '/:playlistId/songs/:songId',
  verifyToken,
  [
    param('playlistId', 'Invalid Playlist ID').isInt({ gt: 0 }),
    param('songId', 'Invalid Song ID').isInt({ gt: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const playlistId = parseInt(req.params.playlistId, 10);
    const songId = parseInt(req.params.songId, 10);
    const userId = req.user.id;

    try {
      // Verify playlist ownership
      const playlist = await playlistModel.getPlaylistByIdAndUserId(playlistId, userId);
      if (!playlist) {
        return res.status(403).json({ msg: 'Forbidden: You do not own this playlist or playlist not found.' });
      }

      const result = await playlistModel.removeSongFromPlaylist(playlistId, songId);
      if (!result) {
        return res.status(404).json({ msg: 'Song not found in this playlist or already removed.' });
      }
      res.status(200).json({ msg: 'Song removed from playlist successfully.' });
    } catch (err) {
      console.error('Error removing song from playlist:', err.message);
      res.status(500).send('Server error while removing song from playlist');
    }
  }
);

// DELETE /api/playlists/:playlistId - Delete a playlist (Protected)
router.delete(
  '/:playlistId',
  verifyToken,
  [param('playlistId', 'Invalid Playlist ID').isInt({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const playlistId = parseInt(req.params.playlistId, 10);
    const userId = req.user.id;

    try {
      // Ownership is checked within deletePlaylistByIdAndUserId model function, 
      // but we can call getPlaylistByIdAndUserId explicitly if we want a specific message before attempting delete
      const deletedPlaylist = await playlistModel.deletePlaylistByIdAndUserId(playlistId, userId);
      if (!deletedPlaylist) {
        return res.status(404).json({ msg: 'Playlist not found or you do not own this playlist.' });
      }
      res.status(200).json({ msg: 'Playlist deleted successfully.', playlistId: deletedPlaylist.id });
    } catch (err) {
      console.error('Error deleting playlist:', err.message);
      res.status(500).send('Server error while deleting playlist');
    }
  }
);

module.exports = router;
