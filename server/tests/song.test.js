const request = require('supertest');
const app = require('../app');
const dbPool = require('../config/db').pool;

describe('Song API Endpoints', () => {
  let token;
  let testUserId;
  let testArtistId;
  let testAlbumId;
  let testUserCredentials;

  beforeAll(async () => {
    // 1. Create a test user
    testUserCredentials = { 
      email: `songtestuser_${Date.now()}@example.com`, 
      password: 'password123', 
      username: `songtestuser_${Date.now()}` 
    };
    const registerRes = await request(app).post('/api/auth/register').send(testUserCredentials);
    testUserId = registerRes.body.id;

    // 2. Login to get a token
    const loginRes = await request(app).post('/api/auth/login').send({ 
      email: testUserCredentials.email, 
      password: testUserCredentials.password 
    });
    token = loginRes.body.token;

    // 3. Create a test artist
    const artistData = { name: `Test Artist for Songs ${Date.now()}` };
    const artistRes = await request(app)
      .post('/api/artists')
      .set('Authorization', `Bearer ${token}`)
      .send(artistData);
    testArtistId = artistRes.body.id;

    // 4. Create a test album
    const albumData = { title: `Test Album for Songs ${Date.now()}`, artist_id: testArtistId };
    const albumRes = await request(app)
      .post('/api/albums')
      .set('Authorization', `Bearer ${token}`)
      .send(albumData);
    testAlbumId = albumRes.body.id;
  });

  afterAll(async () => {
    // Clean up in reverse order of creation: album, artist, user
    if (testAlbumId) {
      try { await dbPool.query('DELETE FROM albums WHERE id = $1', [testAlbumId]); } 
      catch (error) { /* console.error('Error cleaning up test album:', error); */ }
    }
    if (testArtistId) {
      try { await dbPool.query('DELETE FROM artists WHERE id = $1', [testArtistId]); } 
      catch (error) { /* console.error('Error cleaning up test artist:', error); */ }
    }
    if (testUserId) {
      try { await dbPool.query('DELETE FROM users WHERE id = $1', [testUserId]); } 
      catch (error) { /* console.error('Error cleaning up test user:', error); */ }
    }
    await dbPool.end();
  });

  let createdSongId;

  afterEach(async () => {
    if (createdSongId) {
      try {
        await dbPool.query('DELETE FROM songs WHERE id = $1', [createdSongId]);
        createdSongId = null;
      } catch (error) { /* console.error('Error cleaning up song:', error); */ }
    }
  });

  it('should create a new song when authenticated', async () => {
    const songData = { 
      title: 'Test Song Title', 
      album_id: testAlbumId, 
      artist_id: testArtistId, // artist_id needs to match album's artist
      duration_seconds: 180 
    };
    const res = await request(app)
      .post('/api/songs') // Using the general /api/songs endpoint
      .set('Authorization', `Bearer ${token}`)
      .send(songData);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('title', songData.title);
    expect(res.body).toHaveProperty('album_id', testAlbumId);
    expect(res.body).toHaveProperty('artist_id', testArtistId);
    expect(res.body).toHaveProperty('id');
    createdSongId = res.body.id;
  });
  
  it('should fail to create a song if artist_id does not match album artist_id', async () => {
    // Create a different artist
    const otherArtistData = { name: `Other Artist for Song Test ${Date.now()}` };
    const otherArtistRes = await request(app).post('/api/artists').set('Authorization', `Bearer ${token}`).send(otherArtistData);
    const otherArtistId = otherArtistRes.body.id;

    const songData = { 
      title: 'Mismatched Artist Song', 
      album_id: testAlbumId, // Belongs to testArtistId
      artist_id: otherArtistId, // Different artist
      duration_seconds: 180 
    };
    const res = await request(app)
      .post('/api/songs')
      .set('Authorization', `Bearer ${token}`)
      .send(songData);
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors[0].msg).toContain("does not match the album's artist ID");
    
    // Clean up otherArtist
    await dbPool.query('DELETE FROM artists WHERE id = $1', [otherArtistId]);
  });


  it('should get all songs', async () => {
    const songData = { title: `Song for GET All ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId };
    const postRes = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send(songData);
    createdSongId = postRes.body.id;

    const res = await request(app).get('/api/songs'); // This is a public endpoint
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some(song => song.id === createdSongId);
    expect(found).toBe(true);
  });

  it('should get a specific song by ID', async () => {
    const songData = { title: `Specific Song ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId };
    const postRes = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send(songData);
    createdSongId = postRes.body.id;

    const res = await request(app).get(`/api/songs/${createdSongId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', createdSongId);
    expect(res.body).toHaveProperty('title', songData.title);
    expect(res.body.album).toHaveProperty('id', testAlbumId);
    expect(res.body.artist).toHaveProperty('id', testArtistId);
  });
  
  it('should get songs by a specific album ID', async () => {
    const songData = { title: `Song for Album ${testAlbumId} - ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId };
    const postRes = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send(songData);
    createdSongId = postRes.body.id;

    const res = await request(app).get(`/api/albums/${testAlbumId}/songs`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some(song => song.id === createdSongId);
    expect(found).toBe(true);
  });

  it('should update an existing song when authenticated', async () => {
    const songData = { title: `Old Song Name ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId };
    const postRes = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send(songData);
    createdSongId = postRes.body.id;

    const updatedData = { title: `New Song Name ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId, duration_seconds: 200 };
    const res = await request(app)
      .put(`/api/songs/${createdSongId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedData);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title', updatedData.title);
    expect(res.body).toHaveProperty('duration_seconds', updatedData.duration_seconds);
  });

  it('should delete an existing song when authenticated', async () => {
    const songData = { title: `Song To Delete ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId };
    const postRes = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send(songData);
    createdSongId = postRes.body.id;

    const res = await request(app)
      .delete(`/api/songs/${createdSongId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Song deleted successfully');
    expect(res.body.song).toHaveProperty('id', createdSongId);

    const getRes = await request(app).get(`/api/songs/${createdSongId}`);
    expect(getRes.statusCode).toEqual(404);
    
    createdSongId = null; 
  });

  it('should get song playinfo and increment play count', async () => {
    const songData = { title: `Song for Playinfo ${Date.now()}`, album_id: testAlbumId, artist_id: testArtistId };
    const postRes = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send(songData);
    createdSongId = postRes.body.id;

    // Get initial song details to check original play count (assuming it's 0)
    const initialSongDetails = await dbPool.query('SELECT plays FROM songs WHERE id = $1', [createdSongId]);
    const initialPlays = initialSongDetails.rows[0].plays;

    const res = await request(app)
      .get(`/api/songs/${createdSongId}/playinfo`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('songId', createdSongId);
    expect(res.body).toHaveProperty('title', songData.title);
    expect(res.body).toHaveProperty('fileUrl'); // Assuming fileUrl might be null or a string
    expect(res.body).toHaveProperty('plays', initialPlays + 1);

    // Verify in DB that plays was incremented
    const updatedSongDetails = await dbPool.query('SELECT plays FROM songs WHERE id = $1', [createdSongId]);
    expect(updatedSongDetails.rows[0].plays).toEqual(initialPlays + 1);
  });
});
