const db = require('../config/db');

const createArtist = async ({ name, bio, image_url }) => {
  const query = `
    INSERT INTO artists (name, bio, image_url, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING id, name, bio, image_url, created_at, updated_at;
  `;
  const params = [name, bio, image_url];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error creating artist:', error);
    throw error;
  }
};

const getAllArtists = async () => {
  const query = `SELECT id, name, bio, image_url, created_at, updated_at FROM artists ORDER BY name ASC;`;
  try {
    const { rows } = await db.query(query);
    return rows;
  } catch (error) {
    console.error('Error getting all artists:', error);
    throw error;
  }
};

const getArtistById = async (id) => {
  const query = `
    SELECT id, name, bio, image_url, created_at, updated_at
    FROM artists
    WHERE id = $1;
  `;
  try {
    const { rows } = await db.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error getting artist by ID:', error);
    throw error;
  }
};

const updateArtist = async (id, { name, bio, image_url }) => {
  const query = `
    UPDATE artists
    SET name = $1, bio = $2, image_url = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING id, name, bio, image_url, created_at, updated_at;
  `;
  const params = [name, bio, image_url, id];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error updating artist:', error);
    throw error;
  }
};

const deleteArtist = async (id) => {
  const query = `DELETE FROM artists WHERE id = $1 RETURNING id;`; // RETURNING id to confirm deletion
  try {
    const { rows } = await db.query(query, [id]);
    return rows[0]; // Returns { id: deleted_id } or undefined if not found
  } catch (error) {
    console.error('Error deleting artist:', error);
    // Consider error handling for foreign key constraints if artists have albums/songs
    throw error;
  }
};

const searchArtistsByName = async (searchTerm) => {
  const query = `
    SELECT id, name, bio, image_url, created_at, updated_at
    FROM artists
    WHERE name ILIKE '%' || $1 || '%';
  `;
  try {
    const { rows } = await db.query(query, [searchTerm]);
    return rows;
  } catch (error) {
    console.error('Error searching artists by name:', error);
    throw error;
  }
};

module.exports = {
  createArtist,
  getAllArtists,
  getArtistById,
  updateArtist,
  deleteArtist,
  searchArtistsByName, // Added new function
};
