const request = require('supertest');
const app = require('../app');
const dbPool = require('../config/db').pool;

describe('Album API Endpoints', () => {
  let token;
  let testUserId;
  let testArtistId;
  let testUserCredentials;

  beforeAll(async () => {
    // 1. Create a test user
    testUserCredentials = { 
      email: `albumtestuser_${Date.now()}@example.com`, 
      password: 'password123', 
      username: `albumtestuser_${Date.now()}` 
    };
    const registerRes = await request(app).post('/api/auth/register').send(testUserCredentials);
    testUserId = registerRes.body.id;

    // 2. Login to get a token
    const loginRes = await request(app).post('/api/auth/login').send({ 
      email: testUserCredentials.email, 
      password: testUserCredentials.password 
    });
    token = loginRes.body.token;

    // 3. Create a test artist for album creation
    const artistData = { name: `Test Artist for Albums ${Date.now()}`, bio: 'Bio for test artist' };
    const artistRes = await request(app)
      .post('/api/artists')
      .set('Authorization', `Bearer ${token}`)
      .send(artistData);
    testArtistId = artistRes.body.id;
  });

  afterAll(async () => {
    // Clean up: test artist, then test user
    if (testArtistId) {
      try {
        await dbPool.query('DELETE FROM artists WHERE id = $1', [testArtistId]);
      } catch (error) { /* console.error('Error cleaning up test artist:', error); */ }
    }
    if (testUserId) {
      try {
        await dbPool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      } catch (error) { /* console.error('Error cleaning up test user:', error); */ }
    }
    await dbPool.end();
  });

  let createdAlbumId;

  afterEach(async () => {
    if (createdAlbumId) {
      try {
        await dbPool.query('DELETE FROM albums WHERE id = $1', [createdAlbumId]);
        createdAlbumId = null;
      } catch (error) { /* console.error('Error cleaning up album:', error); */ }
    }
  });

  it('should create a new album when authenticated', async () => {
    const albumData = { 
      title: 'Test Album Title', 
      artist_id: testArtistId, 
      release_date: '2023-01-01',
      genre: 'Test Genre' 
    };
    const res = await request(app)
      .post('/api/albums')
      .set('Authorization', `Bearer ${token}`)
      .send(albumData);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('title', albumData.title);
    expect(res.body).toHaveProperty('artist_id', testArtistId);
    expect(res.body).toHaveProperty('id');
    createdAlbumId = res.body.id;
  });

  it('should fail to create an album for a non-existent artist_id', async () => {
    const albumData = { title: 'Album With Bad Artist', artist_id: 999999, release_date: '2023-01-01' };
    const res = await request(app)
      .post('/api/albums')
      .set('Authorization', `Bearer ${token}`)
      .send(albumData);
    expect(res.statusCode).toEqual(404); // Artist not found
    expect(res.body).toHaveProperty('msg', 'Artist with ID 999999 not found.');
  });

  it('should get all albums', async () => {
    // Create an album to ensure the list isn't empty
    const albumData = { title: `Album for GET All ${Date.now()}`, artist_id: testArtistId };
    const postRes = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send(albumData);
    createdAlbumId = postRes.body.id;

    const res = await request(app).get('/api/albums');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some(album => album.id === createdAlbumId);
    expect(found).toBe(true);
  });

  it('should get a specific album by ID', async () => {
    const albumData = { title: `Specific Album ${Date.now()}`, artist_id: testArtistId };
    const postRes = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send(albumData);
    createdAlbumId = postRes.body.id;

    const res = await request(app).get(`/api/albums/${createdAlbumId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', createdAlbumId);
    expect(res.body).toHaveProperty('title', albumData.title);
    expect(res.body.artist).toHaveProperty('id', testArtistId);
  });
  
  it('should get albums by a specific artist ID', async () => {
    const albumData = { title: `Album for Artist ${testArtistId} - ${Date.now()}`, artist_id: testArtistId };
    const postRes = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send(albumData);
    createdAlbumId = postRes.body.id;

    const res = await request(app).get(`/api/artists/${testArtistId}/albums`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some(album => album.id === createdAlbumId && album.artist_id === testArtistId);
    // The getAlbumsByArtistId model does not return artist_id directly in the album object in the array.
    // It returns: id, title, release_date, genre, cover_image_url, created_at, updated_at
    // So, we check if an album with the createdAlbumId is present.
    const foundById = res.body.some(album => album.id === createdAlbumId);
    expect(foundById).toBe(true); 
  });


  it('should update an existing album when authenticated', async () => {
    const albumData = { title: `Old Album Name ${Date.now()}`, artist_id: testArtistId };
    const postRes = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send(albumData);
    createdAlbumId = postRes.body.id;

    const updatedData = { title: `New Album Name ${Date.now()}`, artist_id: testArtistId, genre: "Updated Genre" };
    const res = await request(app)
      .put(`/api/albums/${createdAlbumId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedData);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title', updatedData.title);
    expect(res.body).toHaveProperty('genre', updatedData.genre);
  });

  it('should delete an existing album when authenticated', async () => {
    const albumData = { title: `Album To Delete ${Date.now()}`, artist_id: testArtistId };
    const postRes = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send(albumData);
    createdAlbumId = postRes.body.id;

    const res = await request(app)
      .delete(`/api/albums/${createdAlbumId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Album deleted successfully');
    expect(res.body.album).toHaveProperty('id', createdAlbumId);

    const getRes = await request(app).get(`/api/albums/${createdAlbumId}`);
    expect(getRes.statusCode).toEqual(404);
    
    createdAlbumId = null; 
  });
});
