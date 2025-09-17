// ui.js

// Références aux éléments du DOM (assurez-vous que les IDs correspondent à index.html)
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const registerMessage = document.getElementById('register-message'); // Pour le lien "Already have an account?"

const userSection = document.getElementById('user-section');
const userInfo = document.getElementById('user-info');
const logoutButton = document.getElementById('logout-button');

const musicSection = document.getElementById('music-section');
const playlistSection = document.getElementById('playlist-section'); 

// Références DOM supplémentaires pour la musique
const songsListElement = document.getElementById('songs-list');
const nowPlayingSection = document.getElementById('player'); 
const currentSongTitleElement = document.getElementById('current-song-title');
const currentSongArtistElement = document.getElementById('current-song-artist');
const audioPlayerElement = document.getElementById('audio-player');

// Références DOM supplémentaires pour les playlists
const playlistsListElement = document.getElementById('playlists-list');
const createPlaylistForm = document.getElementById('create-playlist-form'); 
const playlistNameInput = document.getElementById('playlist-name'); 

const playlistSongsSection = document.getElementById('playlist-songs-section');
const currentPlaylistNameElement = document.getElementById('current-playlist-name');
const currentPlaylistSongsListElement = document.getElementById('current-playlist-songs-list');


function showLoginForm() {
    authSection.style.display = 'block';
    userSection.style.display = 'none';
    musicSection.style.display = 'none';
    playlistSection.style.display = 'none';
    playlistSongsSection.style.display = 'none'; // Cacher aussi les détails de la playlist

    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    registerMessage.style.display = 'none'; 
}

function showRegisterForm() {
    authSection.style.display = 'block';
    userSection.style.display = 'none';
    musicSection.style.display = 'none';
    playlistSection.style.display = 'none';
    playlistSongsSection.style.display = 'none'; // Cacher aussi les détails de la playlist

    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    registerMessage.style.display = 'block'; 
}

function showAuthenticatedUI(user) {
    authSection.style.display = 'none';
    userSection.style.display = 'block';
    musicSection.style.display = 'block'; 
    playlistSection.style.display = 'block'; 
    // Ne pas afficher playlistSongsSection par défaut, seulement quand une playlist est cliquée

    if (user && user.username) {
        userInfo.textContent = user.username;
    } else if (user && user.email) {
        userInfo.textContent = user.email;
    } else {
        userInfo.textContent = 'User';
    }
}

function clearForms() {
    loginForm.reset();
    registerForm.reset();
    // clearCreatePlaylistForm(); // Appelé séparément quand nécessaire
}

function displaySongs(songs, onSongClickCallback) {
    if (!songsListElement) {
        console.error('songsListElement not found');
        return;
    }
    songsListElement.innerHTML = ''; 

    if (!songs || songs.length === 0) {
        songsListElement.innerHTML = '<li>No songs available.</li>';
        return;
    }

    songs.forEach(song => {
        const listItem = document.createElement('li');
        const artistName = (song.artist && song.artist.name) ? song.artist.name : (song.artist_name || 'Unknown Artist');
        listItem.textContent = `${song.title} - ${artistName}`;
        listItem.style.cursor = 'pointer';
        listItem.setAttribute('data-song-id', song.id);
        
        listItem.addEventListener('click', () => {
            if (onSongClickCallback) {
                onSongClickCallback(song.id);
            }
        });
        songsListElement.appendChild(listItem);
    });
}

function updateNowPlaying(songData) {
    if (!nowPlayingSection || !currentSongTitleElement || !currentSongArtistElement || !audioPlayerElement) {
        console.error('Player elements not found');
        return;
    }

    if (songData && songData.fileUrl) {
        currentSongTitleElement.textContent = songData.title || 'Unknown Title';
        currentSongArtistElement.textContent = songData.artistName || 'Unknown Artist'; 
        audioPlayerElement.src = songData.fileUrl;
        audioPlayerElement.play()
            .catch(error => console.error('Error playing audio:', error)); 
        nowPlayingSection.style.display = 'block'; 
    } else {
        currentSongTitleElement.textContent = 'N/A';
        currentSongArtistElement.textContent = 'N/A';
        audioPlayerElement.src = '';
        // nowPlayingSection.style.display = 'none'; 
    }
}

// Fonctions pour les playlists
function displayPlaylists(playlists, onPlaylistClickCallback) {
    if (!playlistsListElement) {
        console.error('playlistsListElement not found');
        return;
    }
    playlistsListElement.innerHTML = ''; // Vider la liste existante

    if (!playlists || playlists.length === 0) {
        playlistsListElement.innerHTML = '<li>No playlists created yet.</li>';
        return;
    }

    playlists.forEach(playlist => {
        const listItem = document.createElement('li');
        // Utilisation de playlist.song_count comme implémenté dans le backend model
        listItem.textContent = `${playlist.name} (${playlist.song_count || 0} songs)`;
        listItem.style.cursor = 'pointer';
        listItem.setAttribute('data-playlist-id', playlist.id);
        listItem.setAttribute('data-playlist-name', playlist.name); 

        listItem.addEventListener('click', () => {
            if (onPlaylistClickCallback) {
                onPlaylistClickCallback(playlist.id, playlist.name); 
            }
        });
        playlistsListElement.appendChild(listItem);
    });
}

function displayPlaylistSongs(playlistName, songs, onSongClickCallback) {
    if (!playlistSongsSection || !currentPlaylistNameElement || !currentPlaylistSongsListElement) {
        console.error('Playlist songs display elements not found');
        return;
    }

    currentPlaylistNameElement.textContent = playlistName || 'Selected Playlist';
    currentPlaylistSongsListElement.innerHTML = ''; 

    if (!songs || songs.length === 0) {
        currentPlaylistSongsListElement.innerHTML = '<li>This playlist is empty.</li>';
    } else {
        songs.forEach(song => {
            const listItem = document.createElement('li');
            const artistDisplay = (song.artist && song.artist.name) ? song.artist.name : (song.artist_name || 'Unknown Artist');
            listItem.textContent = `${song.title} - ${artistDisplay}`;
            listItem.style.cursor = 'pointer';
            listItem.setAttribute('data-song-id', song.id);

            listItem.addEventListener('click', () => {
                if (onSongClickCallback) {
                    onSongClickCallback(song.id); 
                }
            });
            currentPlaylistSongsListElement.appendChild(listItem);
        });
    }
    playlistSongsSection.style.display = 'block'; 
}

function clearCreatePlaylistForm() {
    if (createPlaylistForm) { // Vérifier si le formulaire existe avant d'appeler reset()
        createPlaylistForm.reset(); // reset() est une méthode standard pour les formulaires
    } else if (playlistNameInput) { // Fallback si seulement l'input est référencé (moins idéal)
         playlistNameInput.value = '';
    }
}
