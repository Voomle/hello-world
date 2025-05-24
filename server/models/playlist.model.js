const db = require('../config/db');

const createPlaylist = async (userId, name, description = null) => {
  const query = `
    INSERT INTO playlists (user_id, name, description, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING id, user_id, name, description, created_at, updated_at;
  `;
  const params = [userId, name, description];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

const getPlaylistsByUserId = async (userId) => {
  const query = `
    SELECT 
        p.id, p.user_id, p.name, p.description, p.created_at, p.updated_at,
        COUNT(ps.song_id) AS song_count
    FROM playlists p
    LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
    WHERE p.user_id = $1
    GROUP BY p.id
    ORDER BY p.name ASC;
  `;
  try {
    const { rows } = await db.query(query, [userId]);
    return rows;
  } catch (error) {
    console.error('Error getting playlists by user ID:', error);
    throw error;
  }
};

const getPlaylistByIdAndUserId = async (playlistId, userId) => {
  const query = `
    SELECT 
        p.id, p.user_id, p.name, p.description, p.created_at, p.updated_at
    FROM playlists p
    WHERE p.id = $1 AND p.user_id = $2;
  `;
  try {
    const { rows } = await db.query(query, [playlistId, userId]);
    return rows[0]; 
  } catch (error) {
    console.error('Error getting playlist by ID and user ID:', error);
    throw error;
  }
};

const getPlaylistDetailsById = async (playlistId) => {
  // First, get playlist details
  const playlistQuery = `SELECT id, user_id, name, description FROM playlists WHERE id = $1;`;
  // Then, get songs in the playlist
  const songsQuery = `
    SELECT 
        s.id, s.title, s.duration_seconds, s.file_url, s.plays,
        a.id AS album_id, a.title AS album_title, a.cover_image_url AS album_cover_image_url,
        ar.id AS artist_id, ar.name AS artist_name,
        ps.added_at
    FROM playlist_songs ps
    JOIN songs s ON ps.song_id = s.id
    JOIN albums a ON s.album_id = a.id
    JOIN artists ar ON s.artist_id = ar.id
    WHERE ps.playlist_id = $1
    ORDER BY ps.added_at ASC; 
    -- Could also order by track_number on songs table, or a custom order in playlist_songs
  `;
  try {
    const playlistResult = await db.query(playlistQuery, [playlistId]);
    if (playlistResult.rows.length === 0) {
      return null; // Playlist not found
    }
    const playlistDetails = playlistResult.rows[0];
    
    const songsResult = await db.query(songsQuery, [playlistId]);
    playlistDetails.songs = songsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        duration_seconds: row.duration_seconds,
        file_url: row.file_url,
        plays: row.plays,
        album: { id: row.album_id, title: row.album_title, cover_image_url: row.album_cover_image_url },
        artist: { id: row.artist_id, name: row.artist_name },
        added_at: row.added_at
    }));
    
    return playlistDetails;
  } catch (error) {
    console.error('Error getting playlist details by ID:', error);
    throw error;
  }
};

const addSongToPlaylist = async (playlistId, songId) => {
  // Check if song already exists in playlist (optional, DB constraint handles it but this gives a better message)
  const checkQuery = `SELECT id FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2;`;
  const checkResult = await db.query(checkQuery, [playlistId, songId]);
  if (checkResult.rows.length > 0) {
    // Using an error-like object for consistency, or could throw a specific error type
    return { error: 'Song already exists in this playlist.', errorCode: 'DUPLICATE_SONG' };
  }

  const insertQuery = `
    INSERT INTO playlist_songs (playlist_id, song_id, added_at)
    VALUES ($1, $2, NOW())
    RETURNING id, playlist_id, song_id, added_at;
  `;
  try {
    const { rows } = await db.query(insertQuery, [playlistId, songId]);
    return rows[0];
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    // Check for foreign key violations (e.g., song_id or playlist_id doesn't exist)
    if (error.code === '23503') { // PostgreSQL foreign key violation
        return { error: 'Playlist or Song not found.', errorCode: 'FK_VIOLATION' };
    }
    throw error;
  }
};

const removeSongFromPlaylist = async (playlistId, songId) => {
  const query = `
    DELETE FROM playlist_songs
    WHERE playlist_id = $1 AND song_id = $2
    RETURNING id; -- Returns the ID of the deleted playlist_songs entry
  `;
  try {
    const { rows } = await db.query(query, [playlistId, songId]);
    if (rows.length === 0) {
      return null; // Indicates song was not found in the playlist or already removed
    }
    return rows[0]; // Confirms deletion
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    throw error;
  }
};

const deletePlaylistByIdAndUserId = async (playlistId, userId) => {
  // First, verify ownership (though the route should also do this)
  const checkQuery = `SELECT id FROM playlists WHERE id = $1 AND user_id = $2;`;
  const checkResult = await db.query(checkQuery, [playlistId, userId]);
  if (checkResult.rows.length === 0) {
    return null; // Playlist not found or user does not own it
  }

  // If ownership is confirmed, proceed with deletion
  // The ON DELETE CASCADE for playlist_id in playlist_songs table will handle removing entries there.
  const deleteQuery = `DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id;`;
  try {
    const { rows } = await db.query(deleteQuery, [playlistId, userId]);
    return rows[0]; // Returns { id: deleted_playlist_id }
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
};

module.exports = {
  createPlaylist,
  getPlaylistsByUserId,
  getPlaylistByIdAndUserId,
  getPlaylistDetailsById,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylistByIdAndUserId,
};
