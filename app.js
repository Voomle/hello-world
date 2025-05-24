// app.js
// Assurez-vous que api.js, auth.js, et ui.js sont chargés avant app.js dans index.html

document.addEventListener('DOMContentLoaded', async () => {
    // Initialisation de l'UI
    updateUIBasedOnAuthState();

    // Gestionnaires d'événements pour les formulaires
    if (loginForm) { // loginForm est défini dans ui.js, mais app.js y a accès car ce ne sont pas des modules ES6
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                await login(email, password); // Fonction de auth.js
                await updateUIBasedOnAuthState();
                clearForms(); // Fonction de ui.js
            } catch (error) {
                alert(`Login Failed: ${error.message}`); // Simple alerte pour l'erreur
            }
        });
    }

    if (registerForm) { // registerForm est défini dans ui.js
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            try {
                await register(username, email, password); // Fonction de auth.js
                alert('Registration successful! Welcome to Voomle. Please login.'); // Message simple
                showLoginForm(); // Fonction de ui.js
                clearForms(); // Fonction de ui.js
            } catch (error) {
                alert(`Registration Failed: ${error.message}`); // Simple alerte
            }
        });
    }

    if (logoutButton) { // logoutButton est défini dans ui.js
        logoutButton.addEventListener('click', () => {
            logout(); // Fonction de auth.js
            updateUIBasedOnAuthState();
        });
    }

    // Gestionnaires pour basculer entre les formulaires de login/inscription
    if (showRegisterLink) { // showRegisterLink est défini dans ui.js
        showRegisterLink.addEventListener('click', (event) => {
            event.preventDefault();
            showRegisterForm(); // Fonction de ui.js
        });
    }

    if (showLoginLink) { // showLoginLink est défini dans ui.js (dans le registerMessage)
        showLoginLink.addEventListener('click', (event) => {
            event.preventDefault();
            showLoginForm(); // Fonction de ui.js
        });
    }

    // Ajouter la gestion du formulaire de création de playlist
    const createPlaylistFormElement = document.getElementById('create-playlist-form');
    if (createPlaylistFormElement) {
        createPlaylistFormElement.addEventListener('submit', async (event) => {
            event.preventDefault();
            const playlistNameInput = document.getElementById('playlist-name'); // Accès direct à l'input
            if (!playlistNameInput) {
                console.error('Playlist name input not found');
                return;
            }
            const playlistName = playlistNameInput.value.trim();

            if (!playlistName) {
                alert('Playlist name cannot be empty.');
                return;
            }

            if (!isAuthenticated()) {
                alert('You must be logged in to create a playlist.');
                return;
            }

            try {
                // L'API POST /api/playlists attend { name: "..." }
                await request('/playlists', 'POST', { name: playlistName }, getToken());
                alert(`Playlist "${playlistName}" created successfully on Voomle!`);
                clearCreatePlaylistForm(); // Fonction de ui.js pour vider le champ
                loadPlaylists(); // Recharger la liste des playlists pour afficher la nouvelle
            } catch (error) {
                console.error('Failed to create playlist:', error);
                alert(`Error creating playlist: ${error.message}`);
            }
        });
    }
});

// Fonction pour charger et afficher les chansons
async function loadSongs() {
    if (!isAuthenticated()) { // Assurez-vous que l'utilisateur est authentifié (de auth.js)
        console.log('User not authenticated. Cannot load songs.');
        return;
    }
    try {
        // Supposons que votre API /api/songs retourne un tableau d'objets chanson
        const songs = await request('/songs', 'GET', null, getToken()); // Utilise getToken() de auth.js
        
        // La fonction displaySongs dans ui.js attend un callback pour gérer le clic sur une chanson
        displaySongs(songs, async (songId) => { // Le callback reçoit songId (de ui.js)
            try {
                // Appeler l'API pour obtenir les informations de lecture de la chanson (incluant fileUrl)
                const songPlayInfo = await request(`/songs/${songId}/playinfo`, 'GET', null, getToken());
                updateNowPlaying(songPlayInfo); // Fonction de ui.js pour mettre à jour le lecteur
            } catch (error) {
                console.error('Failed to get song play info:', error);
                alert(`Error loading song for playback: ${error.message}`);
            }
        });
    } catch (error) {
        console.error('Failed to load songs:', error);
        // Afficher une erreur dans l'UI si nécessaire
        const songsList = document.getElementById('songs-list'); 
        if (songsList) {
            songsList.innerHTML = '<li>Error loading songs. Please try again later.</li>';
        }
    }
}

// Fonction pour charger et afficher les playlists de l'utilisateur
async function loadPlaylists() {
    if (!isAuthenticated()) {
        console.log('User not authenticated. Cannot load playlists.');
        return;
    }
    try {
        // L'API GET /api/playlists retourne un tableau d'objets playlist de l'utilisateur
        const playlists = await request('/playlists', 'GET', null, getToken());
        
        // displayPlaylists attend un callback pour gérer le clic sur une playlist
        displayPlaylists(playlists, async (playlistId, playlistName) => {
            try {
                // Appeler l'API pour obtenir les détails de la playlist, y compris ses chansons
                // L'API GET /api/playlists/:playlistId retourne { ..., songs: [...] }
                const playlistDetails = await request(`/playlists/${playlistId}`, 'GET', null, getToken());
                
                // displayPlaylistSongs attend le nom de la playlist, la liste des chansons, 
                // et un callback pour jouer une chanson (on réutilise le même que pour la liste principale)
                displayPlaylistSongs(playlistName, playlistDetails.songs, async (songId) => {
                    try {
                        const songPlayInfo = await request(`/songs/${songId}/playinfo`, 'GET', null, getToken());
                        updateNowPlaying(songPlayInfo);
                    } catch (error) {
                        console.error('Failed to get song play info from playlist song:', error);
                        alert(`Error loading song for playback: ${error.message}`);
                    }
                });
            } catch (error) {
                console.error(`Failed to load songs for playlist ${playlistName}:`, error);
                alert(`Error loading playlist songs: ${error.message}`);
                // Optionnel: afficher une erreur dans la section des chansons de la playlist
                if (document.getElementById('current-playlist-songs-list')) {
                     document.getElementById('current-playlist-songs-list').innerHTML = '<li>Error loading songs for this playlist.</li>';
                }
                if (document.getElementById('playlist-songs-section')) {
                     document.getElementById('playlist-songs-section').style.display = 'block'; // S'assurer que la section est visible pour montrer l'erreur
                }
                 if (document.getElementById('current-playlist-name')) {
                    document.getElementById('current-playlist-name').textContent = playlistName;
                }
            }
        });
    } catch (error) {
        console.error('Failed to load playlists:', error);
        if (document.getElementById('playlists-list')) {
            document.getElementById('playlists-list').innerHTML = '<li>Error loading playlists.</li>';
        }
    }
}

// Modifier la fonction updateUIBasedOnAuthState pour appeler aussi loadPlaylists
// Voici la version complète de updateUIBasedOnAuthState modifiée :
async function updateUIBasedOnAuthState() {
    const user = await fetchCurrentUser(); 
    if (user) { 
        showAuthenticatedUI(user); 
        loadSongs(); 
        loadPlaylists(); // <<< AJOUT DE CET APPEL
    } else {
        showLoginForm(); 
        if (document.getElementById('music-section')) document.getElementById('music-section').style.display = 'none';
        if (document.getElementById('playlist-section')) document.getElementById('playlist-section').style.display = 'none';
        if (document.getElementById('playlist-songs-section')) document.getElementById('playlist-songs-section').style.display = 'none'; // Cacher aussi cette section
        if (document.getElementById('songs-list')) document.getElementById('songs-list').innerHTML = '';
        if (document.getElementById('playlists-list')) document.getElementById('playlists-list').innerHTML = ''; // Vider aussi la liste des playlists
        updateNowPlaying(null); 
    }
}
