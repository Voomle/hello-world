const db = require('../config/db');
const bcrypt = require('bcryptjs');

const createUser = async (username, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at, updated_at;
  `;
  const params = [username, email, hashedPassword];
  try {
    const { rows } = await db.query(query, params);
    return rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, username, email, password_hash, created_at, updated_at
    FROM users
    WHERE email = $1;
  `;
  try {
    const { rows } = await db.query(query, [email]);
    return rows[0];
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

const findUserByUsername = async (username) => {
  const query = `
    SELECT id, username, email, password_hash, created_at, updated_at
    FROM users
    WHERE username = $1;
  `;
  try {
    const { rows } = await db.query(query, [username]);
    return rows[0];
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw error;
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
};

const findUserById = async (id) => {
  const query = `
    SELECT id, username, email, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  try {
    const { rows } = await db.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
};
