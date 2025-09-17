const db = require('../config/db');

const createSong = async ({ title, album_id, artist_id, duration_seconds, track_number, file_url }) => {
  const query = `
    INSERT INTO songs (title, album_id, artist_id, duration_seconds, track_number, file_url, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, title, album_id, artist_id, duration_seconds, track_number, file_url, created_at, updated_at;
  `;
  const params = [title, album_id, artist_id, duration_seconds, track_number, file_url];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error creating song:', error);
    throw error;
  }
};

const getAllSongs = async () => {
  const query = `
    SELECT s.id, s.title, s.duration_seconds, s.track_number, s.file_url, s.created_at, s.updated_at,
           al.id AS album_id, al.title AS album_title,
           ar.id AS artist_id, ar.name AS artist_name
    FROM songs s
    JOIN albums al ON s.album_id = al.id
    JOIN artists ar ON s.artist_id = ar.id
    ORDER BY ar.name ASC, al.title ASC, s.track_number ASC;
  `;
  try {
    const { rows } = await db.query(query);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        duration_seconds: row.duration_seconds,
        track_number: row.track_number,
        file_url: row.file_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        album: { id: row.album_id, title: row.album_title },
        artist: { id: row.artist_id, name: row.artist_name }
    }));
  } catch (error) {
    console.error('Error getting all songs:', error);
    throw error;
  }
};

const getSongById = async (id) => {
  const query = `
    SELECT s.id, s.title, s.duration_seconds, s.track_number, s.file_url, s.plays, s.created_at, s.updated_at,
           al.id AS album_id, al.title AS album_title, al.cover_image_url AS album_cover_image_url,
           ar.id AS artist_id, ar.name AS artist_name
    FROM songs s
    JOIN albums al ON s.album_id = al.id
    JOIN artists ar ON s.artist_id = ar.id
    WHERE s.id = $1;
  `;
  try {
    const { rows } = await db.query(query, [id]);
    if (!rows[0]) return null;
    const row = rows[0];
    return {
        id: row.id,
        title: row.title,
        duration_seconds: row.duration_seconds,
        track_number: row.track_number,
        file_url: row.file_url,
        plays: row.plays,
        created_at: row.created_at,
        updated_at: row.updated_at,
        album: { id: row.album_id, title: row.album_title, cover_image_url: row.album_cover_image_url },
        artist: { id: row.artist_id, name: row.artist_name }
    };
  } catch (error) {
    console.error('Error getting song by ID:', error);
    throw error;
  }
};

const getSongsByAlbumId = async (albumId) => {
  const query = `
    SELECT s.id, s.title, s.duration_seconds, s.track_number, s.file_url, s.created_at, s.updated_at,
           ar.id AS artist_id, ar.name AS artist_name
    FROM songs s
    JOIN artists ar ON s.artist_id = ar.id
    WHERE s.album_id = $1
    ORDER BY s.track_number ASC;
  `;
  try {
    const { rows } = await db.query(query, [albumId]);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        duration_seconds: row.duration_seconds,
        track_number: row.track_number,
        file_url: row.file_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        artist: { id: row.artist_id, name: row.artist_name } 
    }));
  } catch (error) {
    console.error('Error getting songs by album ID:', error);
    throw error;
  }
};

const getSongsByArtistId = async (artistId) => {
    const query = `
    SELECT s.id, s.title, s.duration_seconds, s.track_number, s.file_url, s.created_at, s.updated_at,
           al.id AS album_id, al.title AS album_title
    FROM songs s
    JOIN albums al ON s.album_id = al.id
    WHERE s.artist_id = $1
    ORDER BY al.release_date DESC, s.track_number ASC;
  `;
  try {
    const { rows } = await db.query(query, [artistId]);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        duration_seconds: row.duration_seconds,
        track_number: row.track_number,
        file_url: row.file_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        album: { id: row.album_id, title: row.album_title }
    }));
  } catch (error) {
    console.error('Error getting songs by artist ID:', error);
    throw error;
  }
};


const updateSong = async (id, { title, album_id, artist_id, duration_seconds, track_number, file_url }) => {
  const query = `
    UPDATE songs
    SET title = $1, album_id = $2, artist_id = $3, duration_seconds = $4, track_number = $5, file_url = $6, updated_at = NOW()
    WHERE id = $7
    RETURNING id, title, album_id, artist_id, duration_seconds, track_number, file_url, created_at, updated_at;
  `;
  const params = [title, album_id, artist_id, duration_seconds, track_number, file_url, id];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error updating song:', error);
    throw error;
  }
};

const deleteSong = async (id) => {
  const query = `DELETE FROM songs WHERE id = $1 RETURNING id;`;
  try {
    const { rows } = await db.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error deleting song:', error);
    throw error;
  }
};

const incrementPlayCount = async (songId) => {
  const query = `
    UPDATE songs
    SET plays = plays + 1
    WHERE id = $1
    RETURNING plays;
  `;
  try {
    const { rows } = await db.query(query, [songId]);
    if (rows.length > 0) {
      return rows[0].plays;
    }
    return null; 
  } catch (error) {
    console.error('Error incrementing play count:', error);
    throw error;
  }
};

const searchSongsByTitle = async (searchTerm) => {
  const query = `
    SELECT 
        s.id, s.title, s.duration_seconds, s.file_url, s.plays, s.created_at, s.updated_at,
        al.id AS album_id, al.title AS album_title, al.cover_image_url AS album_cover_image_url,
        ar.id AS artist_id, ar.name AS artist_name
    FROM songs s
    JOIN albums al ON s.album_id = al.id
    JOIN artists ar ON s.artist_id = ar.id
    WHERE s.title ILIKE '%' || $1 || '%';
  `;
  // Note: Could also search by artist name or album title by adding to WHERE:
  // OR ar.name ILIKE '%' || $1 || '%'
  // OR al.title ILIKE '%' || $1 || '%'
  // This would require $1 to be passed multiple times or use $2, $3 if different terms.
  // For now, just title as requested.
  try {
    const { rows } = await db.query(query, [searchTerm]);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        duration_seconds: row.duration_seconds,
        file_url: row.file_url,
        plays: row.plays,
        created_at: row.created_at,
        updated_at: row.updated_at,
        album: { id: row.album_id, title: row.album_title, cover_image_url: row.album_cover_image_url },
        artist: { id: row.artist_id, name: row.artist_name }
    }));
  } catch (error) {
    console.error('Error searching songs by title:', error);
    throw error;
  }
};

module.exports = {
  createSong,
  getAllSongs,
  getSongById,
  getSongsByAlbumId,
  getSongsByArtistId,
  updateSong,
  deleteSong,
  incrementPlayCount,
  searchSongsByTitle, // Added new function here
};
