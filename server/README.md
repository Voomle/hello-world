# Backend Server

This directory contains the Node.js/Express.js backend server for the application.

## Setup

1.  Navigate to the `server` directory: `cd server`
2.  Install dependencies: `npm install`
3.  Create a `.env` file based on `.env.example` and provide your database credentials and a JWT secret.
    ```bash
    cp .env.example .env
    # Then edit .env with your actual credentials
    ```
4.  Ensure you have a PostgreSQL database running and accessible.

## Database Schema

### `users` Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Trigger to update updated_at timestamp on row update (already defined for users)
-- CREATE OR REPLACE FUNCTION update_updated_at_column() ...

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

### `artists` Table

```sql
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    image_url VARCHAR(2048), -- URL to an image of the artist
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply the trigger for updated_at
CREATE TRIGGER trigger_artists_updated_at
BEFORE UPDATE ON artists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### `albums` Table

```sql
CREATE TABLE albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, -- If artist is deleted, their albums are deleted
    release_date DATE,
    genre VARCHAR(100),
    cover_image_url VARCHAR(2048), -- URL to the album cover
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply the trigger for updated_at
CREATE TRIGGER trigger_albums_updated_at
BEFORE UPDATE ON albums
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookup of albums by artist
CREATE INDEX idx_albums_artist_id ON albums(artist_id);
```

### `songs` Table

```sql
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE, -- If album is deleted, its songs are deleted
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE SET NULL, -- If artist is deleted, songs remain but artist_id is nulled (or ON DELETE CASCADE)
    duration_seconds INTEGER,
    track_number INTEGER,
    file_url VARCHAR(2048), -- URL to the audio file
    plays INTEGER DEFAULT 0, -- To count song plays
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply the trigger for updated_at
CREATE TRIGGER trigger_songs_updated_at
BEFORE UPDATE ON songs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for faster lookup
CREATE INDEX idx_songs_album_id ON songs(album_id);
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
```

### `playlists` Table

```sql
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply the trigger for updated_at
CREATE TRIGGER trigger_playlists_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookup of playlists by user
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
```

### `playlist_songs` Table (Many-to-Many)

```sql
CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, song_id) -- Prevent duplicate songs in the same playlist
);

-- Index for faster operations on playlist_songs
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_song_id ON playlist_songs(song_id);
```

## Available Scripts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

```

## Available Scripts

In the `server` directory, you can run:

### `npm start`

Runs the app in development mode using `nodemon`.<br />
Open [http://localhost:PORT](http://localhost:PORT) (as defined in your `.env` or 3000 by default) to view it in the browser or use it as an API endpoint.

The server will automatically reload if you make changes to the code.

### `npm test`

(Not yet implemented) Launches the test runner.

## API Endpoints

### Authentication

*   **`POST /api/auth/register`**: Register a new user.
    *   Request body: `{ "username": "testuser", "email": "test@example.com", "password": "password123" }`
    *   Response (success - 201): User object (excluding password).
    *   Response (error - 400/500): Error message.
*   **`POST /api/auth/login`**: Log in an existing user.
    *   Request body: `{ "email": "test@example.com", "password": "password123" }`
    *   Response (success - 200): `{ "token": "jwt_token", "user": { ... } }`.
*   **`GET /api/auth/me`**: (Protected) Get current user's details.

### Artists

*   **`POST /api/artists`**: (Protected) Create a new artist.
*   **`GET /api/artists`**: Get all artists.
*   **`GET /api/artists/:id`**: Get a specific artist.
*   **`PUT /api/artists/:id`**: (Protected) Update an artist.
*   **`DELETE /api/artists/:id`**: (Protected) Delete an artist.

### Albums

*   **`POST /api/albums`**: (Protected) Create a new album.
*   **`GET /api/albums`**: Get all albums.
*   **`GET /api/albums/:id`**: Get a specific album.
*   **`GET /api/artists/:artistId/albums`**: Get albums by a specific artist.
*   **`PUT /api/albums/:id`**: (Protected) Update an album.
*   **`DELETE /api/albums/:id`**: (Protected) Delete an album.

### Songs

*   **`POST /api/songs`**: (Protected) Create a new song.
*   **`POST /api/albums/:albumId/songs`**: (Protected) Create a new song for a specific album.
*   **`GET /api/songs`**: Get all songs.
*   **`GET /api/songs/:id`**: Get a specific song.
*   **`GET /api/albums/:albumId/songs`**: Get songs for a specific album.
*   **`GET /api/songs/:id/playinfo`**: (Protected) Get song information for playback and increment its play count.
*   **`PUT /api/songs/:id`**: (Protected) Update a song.
*   **`DELETE /api/songs/:id`**: (Protected) Delete a song.

### Playlists

*   **`POST /api/playlists`**: (Protected) Create a new playlist.
    *   Request body: `{ "name": "My Chill Vibes", "description": "Songs to relax to" }`
    *   Response (success - 201): Playlist object.
*   **`GET /api/playlists`**: (Protected) Get all playlists for the authenticated user.
    *   Response (success - 200): Array of playlist objects (including `song_count`).
*   **`GET /api/playlists/:playlistId`**: (Protected) Get details of a specific playlist, including its songs.
    *   Response (success - 200): Playlist object with an array of song objects.
*   **`POST /api/playlists/:playlistId/songs`**: (Protected) Add a song to a playlist.
    *   Request body: `{ "songId": 123 }`
    *   Response (success - 201): Confirmation message or details of the added song association.
*   **`DELETE /api/playlists/:playlistId/songs/:songId`**: (Protected) Remove a song from a playlist.
    *   Response (success - 200): Confirmation message.
*   **`DELETE /api/playlists/:playlistId`**: (Protected) Delete an entire playlist.
    *   Response (success - 200): Confirmation message.

### Search

*   **`GET /api/search/songs?q=<searchTerm>`**: Search for songs by title.
    *   Query Parameter: `q` (string, required) - The term to search for in song titles.
    *   Response (success - 200): Array of song objects matching the search term.
    *   Response (success - 404): If no songs match, returns `{ msg: "No songs found...", results: [] }`.
    *   Response (error - 400): If `q` parameter is missing or empty.
*   **`GET /api/search/artists?q=<searchTerm>`**: Search for artists by name.
    *   Query Parameter: `q` (string, required) - The term to search for in artist names.
    *   Response (success - 200): Array of artist objects.
    *   Response (success - 404): If no artists match, returns `{ msg: "No artists found...", results: [] }`.
*   **`GET /api/search/albums?q=<searchTerm>`**: Search for albums by title.
    *   Query Parameter: `q` (string, required) - The term to search for in album titles.
    *   Response (success - 200): Array of album objects (including artist information).
    *   Response (success - 404): If no albums match, returns `{ msg: "No albums found...", results: [] }`.

---

This README provides a basic overview. You might need to refer to the code for more detailed information.
