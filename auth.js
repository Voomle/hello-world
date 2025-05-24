// auth.js
// Assurez-vous que api.js est chargé avant auth.js dans index.html

const TOKEN_KEY = 'authToken';
let currentUser = null; // Pourrait être initialisé depuis localStorage

async function login(email, password) {
    try {
        const data = await request('/auth/login', 'POST', { email, password });
        if (data && data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
            // Stocker également les infos utilisateur si elles sont retournées (ex: data.user)
            // currentUser = data.user; // Supposons que 'user' est retourné par l'API de login
            // Pour l'instant, on va juste stocker le token. On récupérera les infos user avec /auth/me
            console.log('Login successful, token stored.');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login failed:', error.message);
        // Idéalement, retourner le message d'erreur pour l'afficher dans l'UI
        throw error;
    }
}

async function register(username, email, password) {
    try {
        const data = await request('/auth/register', 'POST', { username, email, password });
        // L'API d'enregistrement retourne l'utilisateur créé (sans le mot de passe)
        // Vous pourriez choisir de connecter l'utilisateur directement ici ou de demander une connexion manuelle.
        // Pour l'instant, on affiche juste un message.
        console.log('Registration successful:', data);
        return data; // Retourne les données de l'utilisateur enregistré
    } catch (error) {
        console.error('Registration failed:', error.message);
        throw error;
    }
}

function storeToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    console.log('Logged out.');
    // Actualiser l'UI après la déconnexion (sera géré dans app.js/ui.js)
}

async function fetchCurrentUser() {
    const token = getToken();
    if (!token) {
        currentUser = null;
        return null;
    }
    try {
        // L'API /auth/me retourne les infos de l'utilisateur basé sur le token
        const userData = await request('/auth/me', 'GET', null, token); 
        currentUser = userData;
        return currentUser;
    } catch (error) {
        console.warn('Failed to fetch current user, possibly invalid token:', error.message);
        logout(); // Si le token est invalide, déconnecter l'utilisateur
        return null;
    }
}

function getCurrentUser() {
    return currentUser;
}

function isAuthenticated() {
    const token = getToken();
    // Pour une vérification plus robuste, on pourrait décoder le token et vérifier sa date d'expiration.
    // Pour l'instant, la présence du token suffit, fetchCurrentUser validera.
    return !!token; 
}

// Initialiser l'utilisateur au chargement du script (optionnel, peut être fait dans app.js)
// fetchCurrentUser().then(user => {
//     if(user) console.log('User initialized from token:', user);
// });
