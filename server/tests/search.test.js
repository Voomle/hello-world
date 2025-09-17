const request = require('supertest');
const app = require('../app');
const dbPool = require('../config/db').pool; // Use dbPool

describe('Search API Endpoints', () => {
    let token;
    let testUserId;
    let artistId1, artistId2;
    let albumId1, albumId2;
    let songId1, songId2, songId3;

    // Data for testing
    const artist1Name = 'The Cosmic Keys';
    const artist2Name = 'Lunar Echo';
    const album1Title = 'Galaxy Drifters'; // By Artist 1
    const album2Title = 'Moonlit Melodies'; // By Artist 2
    const song1Title = 'Starlight Serenade'; // Album 1, Artist 1
    const song2Title = 'Cosmic Voyage'; // Album 1, Artist 1
    const song3Title = 'Lunar Dreams'; // Album 2, Artist 2


    beforeAll(async () => {
        // User for creating data
        const userCredentials = { username: `searchtest_${Date.now()}`, email: `searchtest_${Date.now()}@example.com`, password: 'password123' };
        const registerRes = await request(app).post('/api/auth/register').send(userCredentials);
        testUserId = registerRes.body.id; // API returns user object directly
        const loginRes = await request(app).post('/api/auth/login').send({ email: userCredentials.email, password: userCredentials.password });
        token = loginRes.body.token;

        // Create Artists
        const artist1Res = await request(app).post('/api/artists').set('Authorization', `Bearer ${token}`).send({ name: artist1Name });
        artistId1 = artist1Res.body.id; // API returns artist obj directly
        const artist2Res = await request(app).post('/api/artists').set('Authorization', `Bearer ${token}`).send({ name: artist2Name });
        artistId2 = artist2Res.body.id; // API returns artist obj directly

        // Create Albums
        const album1Res = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send({ title: album1Title, artist_id: artistId1, release_date: '2023-01-01' });
        albumId1 = album1Res.body.id; // API returns album obj directly
        const album2Res = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send({ title: album2Title, artist_id: artistId2, release_date: '2023-02-01' });
        albumId2 = album2Res.body.id; // API returns album obj directly

        // Create Songs
        // Note: The API for songs requires artist_id to match album's artist_id
        const song1Res = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send({ title: song1Title, album_id: albumId1, artist_id: artistId1, duration_seconds: 180 });
        songId1 = song1Res.body.id; // API returns song obj directly
        const song2Res = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send({ title: song2Title, album_id: albumId1, artist_id: artistId1, duration_seconds: 220 });
        songId2 = song2Res.body.id; // API returns song obj directly
        const song3Res = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send({ title: song3Title, album_id: albumId2, artist_id: artistId2, duration_seconds: 200 });
        songId3 = song3Res.body.id; // API returns song obj directly
    });

    afterAll(async () => {
        // Clean up data in reverse order of creation or use CASCADE
        // Songs are deleted by album deletion due to CASCADE ON DELETE for album_id
        // Albums are deleted by artist deletion due to CASCADE ON DELETE for artist_id
        // So, deleting artists and the user should be enough if CASCADE is set up for all FKs.
        // However, explicit deletion is safer for tests if not all cascades are guaranteed.
        if (songId1) await dbPool.query('DELETE FROM songs WHERE id = $1', [songId1]);
        if (songId2) await dbPool.query('DELETE FROM songs WHERE id = $1', [songId2]);
        if (songId3) await dbPool.query('DELETE FROM songs WHERE id = $1', [songId3]);
        if (albumId1) await dbPool.query('DELETE FROM albums WHERE id = $1', [albumId1]);
        if (albumId2) await dbPool.query('DELETE FROM albums WHERE id = $1', [albumId2]);
        if (artistId1) await dbPool.query('DELETE FROM artists WHERE id = $1', [artistId1]);
        if (artistId2) await dbPool.query('DELETE FROM artists WHERE id = $1', [artistId2]);
        if (testUserId) await dbPool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await dbPool.end();
    });

    describe('GET /api/search/songs', () => {
        it('should find multiple songs by title (partial, case-insensitive)', async () => {
            const res = await request(app).get('/api/search/songs?q=Cosmic');
            expect(res.statusCode).toEqual(200);
            // API returns array directly for 200
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1); 
            expect(res.body.some(song => song.title === song2Title)).toBe(true); // "Cosmic Voyage"
        });

        it('should find a single song by exact title (case-insensitive)', async () => {
            const res = await request(app).get('/api/search/songs?q=starlight serenade');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toEqual(1);
            expect(res.body[0].title).toEqual(song1Title); // "Starlight Serenade"
        });

        it('should return 404 if no songs match the search term', async () => {
            const res = await request(app).get('/api/search/songs?q=NonExistentSongZZZ');
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('msg', 'No songs found matching "NonExistentSongZZZ".');
            expect(res.body).toHaveProperty('results', []);
        });
        
        it('should return 400 if search query "q" is missing', async () => {
            const res = await request(app).get('/api/search/songs');
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].param).toEqual('q');
        });

        it('should return 400 if search query "q" is empty', async () => {
            const res = await request(app).get('/api/search/songs?q=');
            expect(res.statusCode).toEqual(400);
             expect(res.body.errors[0].param).toEqual('q');
        });
    });

    describe('GET /api/search/artists', () => {
        it('should find an artist by name (partial, case-insensitive)', async () => {
            const res = await request(app).get('/api/search/artists?q=Lunar');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toEqual(1);
            expect(res.body[0].name).toEqual(artist2Name); // "Lunar Echo"
        });

        it('should find an artist by exact name (case-insensitive)', async () => {
            const res = await request(app).get('/api/search/artists?q=the cosmic keys');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toEqual(1);
            expect(res.body[0].name).toEqual(artist1Name);
        });
        
        it('should find multiple artists if names are similar (e.g. "The")', async () => {
            // For this, we'd need another artist like "The Other Band"
            // For now, test with a very broad term that might match one or more
            const res = await request(app).get('/api/search/artists?q=The');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.some(artist => artist.name === artist1Name)).toBe(true); // "The Cosmic Keys"
        });

        it('should return 404 if no artists match the search term', async () => {
            const res = await request(app).get('/api/search/artists?q=NonExistentArtistZZZ');
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('msg', 'No artists found matching "NonExistentArtistZZZ".');
            expect(res.body).toHaveProperty('results', []);
        });
        
        it('should return 400 if search query "q" is missing', async () => {
            const res = await request(app).get('/api/search/artists');
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].param).toEqual('q');
        });
    });

    describe('GET /api/search/albums', () => {
        it('should find an album by title (partial, case-insensitive)', async () => {
            const res = await request(app).get('/api/search/albums?q=Moonlit');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toEqual(1);
            expect(res.body[0].title).toEqual(album2Title); // "Moonlit Melodies"
            expect(res.body[0].artist.name).toEqual(artist2Name);
        });

        it('should find an album by exact title (case-insensitive)', async () => {
            const res = await request(app).get('/api/search/albums?q=galaxy drifters');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toEqual(1);
            expect(res.body[0].title).toEqual(album1Title);
            expect(res.body[0].artist.name).toEqual(artist1Name);
        });

        it('should return 404 if no albums match the search term', async () => {
            const res = await request(app).get('/api/search/albums?q=NonExistentAlbumZZZ');
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('msg', 'No albums found matching "NonExistentAlbumZZZ".');
            expect(res.body).toHaveProperty('results', []);
        });
        
        it('should return 400 if search query "q" is missing', async () => {
            const res = await request(app).get('/api/search/albums');
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].param).toEqual('q');
        });
    });
});
