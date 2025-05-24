const db = require('../config/db');

const createAlbum = async ({ title, artist_id, release_date, genre, cover_image_url }) => {
  const query = `
    INSERT INTO albums (title, artist_id, release_date, genre, cover_image_url, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id, title, artist_id, release_date, genre, cover_image_url, created_at, updated_at;
  `;
  const params = [title, artist_id, release_date, genre, cover_image_url];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
};

const getAllAlbums = async () => {
  const query = `
    SELECT a.id, a.title, a.release_date, a.genre, a.cover_image_url, a.created_at, a.updated_at,
           ar.id AS artist_id, ar.name AS artist_name
    FROM albums a
    JOIN artists ar ON a.artist_id = ar.id
    ORDER BY a.title ASC;
  `;
  try {
    const { rows } = await db.query(query);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        release_date: row.release_date,
        genre: row.genre,
        cover_image_url: row.cover_image_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        artist: {
            id: row.artist_id,
            name: row.artist_name
        }
    }));
  } catch (error) {
    console.error('Error getting all albums:', error);
    throw error;
  }
};

const getAlbumById = async (id) => {
  const query = `
    SELECT a.id, a.title, a.release_date, a.genre, a.cover_image_url, a.created_at, a.updated_at,
           ar.id AS artist_id, ar.name AS artist_name, ar.bio AS artist_bio
    FROM albums a
    JOIN artists ar ON a.artist_id = ar.id
    WHERE a.id = $1;
  `;
  try {
    const { rows } = await db.query(query, [id]);
    if (!rows[0]) return null;
    const row = rows[0];
    return {
        id: row.id,
        title: row.title,
        release_date: row.release_date,
        genre: row.genre,
        cover_image_url: row.cover_image_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        artist: {
            id: row.artist_id,
            name: row.artist_name,
            bio: row.artist_bio
        }
    };
  } catch (error) {
    console.error('Error getting album by ID:', error);
    throw error;
  }
};

const getAlbumsByArtistId = async (artistId) => {
  const query = `
    SELECT id, title, release_date, genre, cover_image_url, created_at, updated_at
    FROM albums
    WHERE artist_id = $1
    ORDER BY release_date DESC;
  `;
  try {
    const { rows } = await db.query(query, [artistId]);
    return rows;
  } catch (error) {
    console.error('Error getting albums by artist ID:', error);
    throw error;
  }
};

const updateAlbum = async (id, { title, artist_id, release_date, genre, cover_image_url }) => {
  const query = `
    UPDATE albums
    SET title = $1, artist_id = $2, release_date = $3, genre = $4, cover_image_url = $5, updated_at = NOW()
    WHERE id = $6
    RETURNING id, title, artist_id, release_date, genre, cover_image_url, created_at, updated_at;
  `;
  const params = [title, artist_id, release_date, genre, cover_image_url, id];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error updating album:', error);
    throw error;
  }
};

const deleteAlbum = async (id) => {
  const query = `DELETE FROM albums WHERE id = $1 RETURNING id;`;
  try {
    const { rows } = await db.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error deleting album:', error);
    throw error;
  }
};

const searchAlbumsByTitle = async (searchTerm) => {
  const query = `
    SELECT 
        a.id, a.title, a.release_date, a.genre, a.cover_image_url, a.created_at, a.updated_at,
        ar.id AS artist_id, ar.name AS artist_name
    FROM albums a
    JOIN artists ar ON a.artist_id = ar.id
    WHERE a.title ILIKE '%' || $1 || '%';
  `;
  try {
    const { rows } = await db.query(query, [searchTerm]);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        release_date: row.release_date,
        genre: row.genre,
        cover_image_url: row.cover_image_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        artist: {
            id: row.artist_id,
            name: row.artist_name
        }
    }));
  } catch (error) {
    console.error('Error searching albums by title:', error);
    throw error;
  }
};

module.exports = {
  createAlbum,
  getAllAlbums,
  getAlbumById,
  getAlbumsByArtistId,
  updateAlbum,
  deleteAlbum,
  searchAlbumsByTitle, // Added new function
};
