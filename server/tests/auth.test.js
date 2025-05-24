const request = require('supertest');
const app = require('../app'); // Votre application Express principale
const dbPool = require('../config/db').pool; // Accès direct au pool exporté

describe('Auth API Endpoints', () => {
  let testUser;

  beforeEach(() => { // beforeEach for unique user per test to avoid conflicts in parallel or failed cleanup
    testUser = {
      username: `testuser_${Date.now()}`, // Nom d'utilisateur unique
      email: `test_${Date.now()}@example.com`, // Email unique
      password: 'password123',
    };
  });

  afterEach(async () => {
    // Nettoyage : Supprimer l'utilisateur créé après chaque test
    if (testUser && testUser.email) {
      try {
        await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      } catch (error) {
        // console.error('Error cleaning up user:', error.message);
      }
    }
  });
  
  afterAll(async () => {
    // Fermer la connexion à la base de données pour permettre à Jest de se terminer proprement
    // await dbPool.end(); // Commenté pour permettre à d'autres fichiers de test d'utiliser la connexion
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
      });
    expect(res.statusCode).toEqual(201);
    // The API returns the user object directly
    expect(res.body).toHaveProperty('email', testUser.email);
    expect(res.body).toHaveProperty('username', testUser.username);
    expect(res.body).not.toHaveProperty('password_hash'); // Vérifier que le hash n'est pas retourné
  });

  it('should fail to register a user with an existing email', async () => {
    // D'abord, enregistrer un utilisateur
    await request(app).post('/api/auth/register').send(testUser);
    
    // Ensuite, essayer de l'enregistrer à nouveau avec le même email mais un autre username
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        username: `another_${testUser.username}`, 
        email: testUser.email, 
        password: testUser.password 
      });
    expect(res.statusCode).toEqual(400); 
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors[0].msg).toEqual('User with this email already exists');
  });

  it('should fail to register a user with an existing username', async () => {
    // D'abord, enregistrer un utilisateur
    await request(app).post('/api/auth/register').send(testUser);
    
    // Ensuite, essayer de l'enregistrer à nouveau avec le même username mais un autre email
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        username: testUser.username, 
        email: `another_${testUser.email}`, 
        password: testUser.password 
      });
    expect(res.statusCode).toEqual(400); 
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors[0].msg).toEqual('Username already taken');
  });

  it('should login an existing user successfully', async () => {
    // D'abord, enregistrer l'utilisateur
    await request(app).post('/api/auth/register').send(testUser);

    // Ensuite, essayer de se connecter
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testUser.email);
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('should fail to login with incorrect password', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });
    expect(res.statusCode).toEqual(401); 
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors[0].msg).toEqual('Invalid credentials');
  });

  it('should fail to login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors[0].msg).toEqual('Invalid credentials');
  });
});
