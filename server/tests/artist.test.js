const request = require('supertest');
const app = require('../app'); // Votre application Express principale
const dbPool = require('../config/db').pool; // Accès direct au pool exporté

describe('Artist API Endpoints', () => {
  let token;
  let testUserId;
  let testUserCredentials; // Store credentials to avoid recreating them if needed elsewhere

  beforeAll(async () => {
    testUserCredentials = { 
      email: `artisttestuser_${Date.now()}@example.com`, 
      password: 'password123', 
      username: `artisttestuser_${Date.now()}` 
    };
    // Enregistrer un utilisateur de test
    const registerRes = await request(app).post('/api/auth/register').send(testUserCredentials);
    testUserId = registerRes.body.id; // Assurez-vous que l'ID est bien là

    // Connecter l'utilisateur pour obtenir un token
    const loginRes = await request(app).post('/api/auth/login').send({ 
      email: testUserCredentials.email, 
      password: testUserCredentials.password 
    });
    token = loginRes.body.token;
  });
  
  afterAll(async () => {
    // Nettoyer l'utilisateur de test
    if (testUserId) {
      try {
        await dbPool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      } catch (error) {
        // console.error('Error cleaning up test user:', error);
      }
    }
    // Fermer la connexion à la base de données (pour ce fichier de test)
    await dbPool.end(); 
  });

  let createdArtistId; // Pour stocker l'ID de l'artiste créé dans un test et le nettoyer

  afterEach(async () => {
    // Nettoyer l'artiste créé après chaque test où createdArtistId est défini
    if (createdArtistId) {
      try {
        await dbPool.query('DELETE FROM artists WHERE id = $1', [createdArtistId]);
        createdArtistId = null; // Réinitialiser pour le prochain test
      } catch (error) {
        // console.error('Error cleaning up artist:', error);
      }
    }
  });

  it('should create a new artist when authenticated', async () => {
    const artistData = { name: 'The Test Strokes', bio: 'An indie rock band.' };
    const res = await request(app)
      .post('/api/artists')
      .set('Authorization', `Bearer ${token}`)
      .send(artistData);
    
    expect(res.statusCode).toEqual(201);
    // The API returns the artist object directly
    expect(res.body).toHaveProperty('name', artistData.name);
    expect(res.body).toHaveProperty('bio', artistData.bio);
    expect(res.body).toHaveProperty('id');
    createdArtistId = res.body.id; // Sauvegarder pour le nettoyage
  });

  it('should fail to create an artist if not authenticated', async () => {
    const res = await request(app)
      .post('/api/artists')
      .send({ name: 'Unauthorized Artist', bio: 'Should not be created' });
    expect(res.statusCode).toEqual(401); // Ou 403 selon l'implémentation du middleware
  });
  
  it('should get all artists', async () => {
    // Optionnel: créer un artiste pour s'assurer que la liste n'est pas vide
    const artistData = { name: 'The Testers', bio: 'A band for testing GET all.' };
    const postRes = await request(app)
                        .post('/api/artists')
                        .set('Authorization', `Bearer ${token}`)
                        .send(artistData);
    createdArtistId = postRes.body.id; // Pour le cleanup

    const res = await request(app).get('/api/artists');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Vérifier si l'artiste créé est dans la liste (si la liste n'est pas vide)
    if (res.body.length > 0) {
        const found = res.body.some(artist => artist.id === createdArtistId);
        expect(found).toBe(true);
    }
  });

  it('should get a specific artist by ID', async () => {
    const artistData = { name: 'Specific Artist', bio: 'Details here.' };
    const postRes = await request(app)
      .post('/api/artists')
      .set('Authorization', `Bearer ${token}`)
      .send(artistData);
    createdArtistId = postRes.body.id;

    const res = await request(app).get(`/api/artists/${createdArtistId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', createdArtistId);
    expect(res.body).toHaveProperty('name', artistData.name);
  });

  it('should return 404 for a non-existent artist ID', async () => {
    const res = await request(app).get('/api/artists/999999'); // ID qui n'existe probablement pas
    expect(res.statusCode).toEqual(404);
  });

  it('should update an existing artist when authenticated', async () => {
    const artistData = { name: 'Old Name Artist', bio: 'Old bio.' };
    const postRes = await request(app)
      .post('/api/artists')
      .set('Authorization', `Bearer ${token}`)
      .send(artistData);
    createdArtistId = postRes.body.id;

    const updatedData = { name: 'New Name Artist', bio: 'Updated bio.' };
    const res = await request(app)
      .put(`/api/artists/${createdArtistId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedData);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name', updatedData.name);
    expect(res.body).toHaveProperty('bio', updatedData.bio);
  });

  it('should delete an existing artist when authenticated', async () => {
    const artistData = { name: 'Artist To Delete', bio: 'Will be deleted.' };
    const postRes = await request(app)
      .post('/api/artists')
      .set('Authorization', `Bearer ${token}`)
      .send(artistData);
    createdArtistId = postRes.body.id; // Stocker l'ID pour le test

    const res = await request(app)
      .delete(`/api/artists/${createdArtistId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Artist deleted successfully');
    expect(res.body.artist).toHaveProperty('id', createdArtistId);

    // Vérifier que l'artiste a bien été supprimé (GET devrait retourner 404)
    const getRes = await request(app).get(`/api/artists/${createdArtistId}`);
    expect(getRes.statusCode).toEqual(404);
    
    createdArtistId = null; // Important: ne pas essayer de le supprimer à nouveau dans afterEach
  });
});
