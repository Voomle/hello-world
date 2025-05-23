const request = require('supertest');
const app = require('../app');
const dbPool = require('../config/db').pool; // Correctly use dbPool

describe('Playlist API Endpoints', () => {
    let token;
    let testUserId;
    let testArtistId;
    let testAlbumId;
    let testSongId1, testSongId2;
    let otherTestUserId, otherToken; // For ownership tests

    beforeAll(async () => {
        // 1. Create a primary test user & get token
        const userCredentials = { username: `playlisttest_${Date.now()}`, email: `playlisttest_${Date.now()}@example.com`, password: 'password123' };
        const registerRes = await request(app).post('/api/auth/register').send(userCredentials);
        testUserId = registerRes.body.id; // Assuming register returns user with id
        const loginRes = await request(app).post('/api/auth/login').send({ email: userCredentials.email, password: userCredentials.password });
        token = loginRes.body.token;

        // 1b. Create a secondary test user & get token for ownership tests
        const otherUserCredentials = { username: `otherplaylisttest_${Date.now()}`, email: `otherplaylisttest_${Date.now()}@example.com`, password: 'password123' };
        const otherRegisterRes = await request(app).post('/api/auth/register').send(otherUserCredentials);
        otherTestUserId = otherRegisterRes.body.id;
        const otherLoginRes = await request(app).post('/api/auth/login').send({ email: otherUserCredentials.email, password: otherUserCredentials.password });
        otherToken = otherLoginRes.body.token;

        // 2. Create a test artist
        const artistRes = await request(app).post('/api/artists').set('Authorization', `Bearer ${token}`).send({ name: 'Artist for Playlist Tests' });
        testArtistId = artistRes.body.id; // Adjusted: API returns artist obj directly

        // 3. Create a test album
        const albumRes = await request(app).post('/api/albums').set('Authorization', `Bearer ${token}`).send({ title: 'Album for Playlist Tests', artist_id: testArtistId, release_date: '2023-01-01' });
        testAlbumId = albumRes.body.id; // Adjusted: API returns album obj directly

        // 4. Create some test songs
        const song1Res = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send({ title: 'Song 1 for Playlists', album_id: testAlbumId, artist_id: testArtistId, duration_seconds: 180 });
        testSongId1 = song1Res.body.id; // Adjusted: API returns song obj directly
        const song2Res = await request(app).post('/api/songs').set('Authorization', `Bearer ${token}`).send({ title: 'Song 2 for Playlists', album_id: testAlbumId, artist_id: testArtistId, duration_seconds: 200 });
        testSongId2 = song2Res.body.id; // Adjusted: API returns song obj directly
    });

    afterAll(async () => {
        // Clean up: songs, album, artist, users
        // Note: playlist_songs entries are cleaned by playlist deletion due to CASCADE
        if (testSongId1) await dbPool.query('DELETE FROM songs WHERE id = $1', [testSongId1]);
        if (testSongId2) await dbPool.query('DELETE FROM songs WHERE id = $1', [testSongId2]);
        if (testAlbumId) await dbPool.query('DELETE FROM albums WHERE id = $1', [testAlbumId]);
        if (testArtistId) await dbPool.query('DELETE FROM artists WHERE id = $1', [testArtistId]);
        if (testUserId) await dbPool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        if (otherTestUserId) await dbPool.query('DELETE FROM users WHERE id = $1', [otherTestUserId]);
        
        await dbPool.end();
    });

    let createdPlaylistId;
    afterEach(async () => {
        if (createdPlaylistId) {
            // Ensure cleanup is done by the owner if necessary, or use direct DB delete
            // For test simplicity, direct DB delete is fine.
            await dbPool.query('DELETE FROM playlists WHERE id = $1', [createdPlaylistId]);
            createdPlaylistId = null;
        }
    });

    it('should create a new playlist', async () => {
        const playlistName = 'My Test Playlist';
        const res = await request(app)
            .post('/api/playlists')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: playlistName, description: 'A cool playlist' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('name', playlistName); // API returns playlist obj directly
        expect(res.body).toHaveProperty('user_id', testUserId);
        createdPlaylistId = res.body.id;
    });

    it('should get all playlists for the authenticated user', async () => {
        // Create a playlist first
        const playlistName = 'Playlist for GET Test';
        const postRes = await request(app).post('/api/playlists').set('Authorization', `Bearer ${token}`).send({ name: playlistName });
        createdPlaylistId = postRes.body.id;

        const res = await request(app)
            .get('/api/playlists')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        const foundPlaylist = res.body.find(p => p.id === createdPlaylistId);
        expect(foundPlaylist).toBeDefined();
        expect(foundPlaylist.name).toEqual(playlistName);
    });

    describe('Operations on a specific playlist', () => {
        beforeEach(async () => { // Create a new playlist for each test in this block
            const playlistName = `Playlist_${Date.now()}`;
            const res = await request(app).post('/api/playlists').set('Authorization', `Bearer ${token}`).send({ name: playlistName });
            createdPlaylistId = res.body.id;
        });

        it('should add a song to a playlist', async () => {
            const res = await request(app)
                .post(`/api/playlists/${createdPlaylistId}/songs`)
                .set('Authorization', `Bearer ${token}`)
                .send({ songId: testSongId1 });
            expect(res.statusCode).toEqual(201);
            expect(res.body.data).toHaveProperty('playlist_id', createdPlaylistId);
            expect(res.body.data).toHaveProperty('song_id', testSongId1);
        });

        it('should fail to add the same song twice to a playlist', async () => {
            // Add song for the first time
            await request(app)
                .post(`/api/playlists/${createdPlaylistId}/songs`)
                .set('Authorization', `Bearer ${token}`)
                .send({ songId: testSongId1 });
            
            // Try to add the same song again
            const res = await request(app)
                .post(`/api/playlists/${createdPlaylistId}/songs`)
                .set('Authorization', `Bearer ${token}`)
                .send({ songId: testSongId1 });
            expect(res.statusCode).toEqual(409); // Conflict
            expect(res.body).toHaveProperty('msg', 'Song already exists in this playlist.');
        });
        
        it('should get details of a specific playlist with its songs', async () => {
            // Add song1 and song2 to the playlist
            await request(app).post(`/api/playlists/${createdPlaylistId}/songs`).set('Authorization', `Bearer ${token}`).send({ songId: testSongId1 });
            await request(app).post(`/api/playlists/${createdPlaylistId}/songs`).set('Authorization', `Bearer ${token}`).send({ songId: testSongId2 });

            const res = await request(app)
                .get(`/api/playlists/${createdPlaylistId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('id', createdPlaylistId);
            expect(res.body).toHaveProperty('songs');
            expect(Array.isArray(res.body.songs)).toBe(true);
            expect(res.body.songs.length).toEqual(2);
            const songIdsInPlaylist = res.body.songs.map(s => s.id);
            expect(songIdsInPlaylist).toContain(testSongId1);
            expect(songIdsInPlaylist).toContain(testSongId2);
        });

        it('should remove a song from a playlist', async () => {
            await request(app).post(`/api/playlists/${createdPlaylistId}/songs`).set('Authorization', `Bearer ${token}`).send({ songId: testSongId1 });
            await request(app).post(`/api/playlists/${createdPlaylistId}/songs`).set('Authorization', `Bearer ${token}`).send({ songId: testSongId2 });

            const res = await request(app)
                .delete(`/api/playlists/${createdPlaylistId}/songs/${testSongId1}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('msg', 'Song removed from playlist successfully.');

            // Verify song1 is removed and song2 remains
            const detailsRes = await request(app).get(`/api/playlists/${createdPlaylistId}`).set('Authorization', `Bearer ${token}`);
            expect(detailsRes.body.songs.length).toEqual(1);
            expect(detailsRes.body.songs[0].id).toEqual(testSongId2);
        });
        
        it('should delete a playlist and its songs associations (CASCADE)', async () => {
            await request(app).post(`/api/playlists/${createdPlaylistId}/songs`).set('Authorization', `Bearer ${token}`).send({ songId: testSongId1 });
            
            const res = await request(app)
                .delete(`/api/playlists/${createdPlaylistId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('msg', 'Playlist deleted successfully.');
            expect(res.body).toHaveProperty('playlistId', createdPlaylistId);

            // Verify playlist is deleted
            const getPlaylistRes = await request(app).get(`/api/playlists/${createdPlaylistId}`).set('Authorization', `Bearer ${token}`);
            expect(getPlaylistRes.statusCode).toEqual(403); // Or 404 if ownership check is strict

            // Verify songs are removed from playlist_songs (CASCADE check)
            const playlistSongsRes = await dbPool.query('SELECT * FROM playlist_songs WHERE playlist_id = $1', [createdPlaylistId]);
            expect(playlistSongsRes.rows.length).toEqual(0);
            
            createdPlaylistId = null; // To prevent afterEach from trying to delete it again
        });
    });

    describe('Playlist Ownership and Error Cases', () => {
        let ownedPlaylistId;

        beforeEach(async () => { // Create a playlist owned by the primary testUser
            const res = await request(app).post('/api/playlists').set('Authorization', `Bearer ${token}`).send({ name: `OwnedPlaylist_${Date.now()}` });
            ownedPlaylistId = res.body.id;
        });

        afterEach(async () => { // Clean up the owned playlist
            if (ownedPlaylistId) {
                await dbPool.query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [ownedPlaylistId, testUserId]);
                ownedPlaylistId = null;
            }
        });

        it('should fail to get details of a playlist not owned by user', async () => {
            const res = await request(app)
                .get(`/api/playlists/${ownedPlaylistId}`)
                .set('Authorization', `Bearer ${otherToken}`); // Use other user's token
            expect(res.statusCode).toEqual(403);
        });

        it('should fail to add a song to a playlist not owned by user', async () => {
            const res = await request(app)
                .post(`/api/playlists/${ownedPlaylistId}/songs`)
                .set('Authorization', `Bearer ${otherToken}`) // Use other user's token
                .send({ songId: testSongId1 });
            expect(res.statusCode).toEqual(403);
        });

        it('should fail to remove a song from a playlist not owned by user', async () => {
            // Add song by owner first
            await request(app).post(`/api/playlists/${ownedPlaylistId}/songs`).set('Authorization', `Bearer ${token}`).send({ songId: testSongId1 });
            
            const res = await request(app)
                .delete(`/api/playlists/${ownedPlaylistId}/songs/${testSongId1}`)
                .set('Authorization', `Bearer ${otherToken}`); // Use other user's token
            expect(res.statusCode).toEqual(403);
        });

        it('should fail to delete a playlist not owned by user', async () => {
            const res = await request(app)
                .delete(`/api/playlists/${ownedPlaylistId}`)
                .set('Authorization', `Bearer ${otherToken}`); // Use other user's token
            expect(res.statusCode).toEqual(404); // Model's deletePlaylistByIdAndUserId returns null if not owner, route translates to 404
        });
        
        it('should fail to add a non-existent song to a playlist', async () => {
            const nonExistentSongId = 999999;
            const res = await request(app)
                .post(`/api/playlists/${ownedPlaylistId}/songs`)
                .set('Authorization', `Bearer ${token}`)
                .send({ songId: nonExistentSongId });
            expect(res.statusCode).toEqual(404); // FK_VIOLATION in model leads to 404
            expect(res.body).toHaveProperty('msg', 'Playlist or Song not found.');
        });
    });
});
