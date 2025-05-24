document.addEventListener('DOMContentLoaded', () => {
    const songListUL = document.getElementById('song-list');
    const audioPlayer = document.getElementById('audio-player');
    const currentSongInfoDiv = document.getElementById('current-song-info');
    const playPauseButton = document.getElementById('play-pause-button');

    const API_BASE_URL = 'http://localhost:5000/api'; // Assuming backend runs on port 5000

    let currentSongs = []; // To store the fetched songs array

    // Fetch songs from the backend
    async function fetchSongs() {
        console.log('Fetching songs...');
        try {
            const response = await fetch(`${API_BASE_URL}/songs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            currentSongs = await response.json();
            console.log('Songs fetched:', currentSongs);
            populateSongList(currentSongs);
        } catch (error) {
            console.error('Error fetching songs:', error);
            songListUL.innerHTML = '<li>Failed to load songs. Is the backend running?</li>';
        }
    }

    // Populate the song list in the UI
    function populateSongList(songs) {
        songListUL.innerHTML = ''; // Clear existing list

        if (!songs || songs.length === 0) {
            songListUL.innerHTML = '<li>No songs available.</li>';
            return;
        }

        songs.forEach(song => {
            const listItem = document.createElement('li');
            listItem.textContent = `${song.title} - ${song.artist_name} (${song.album_title})`;
            listItem.dataset.songId = song.song_id; // Store song_id
            listItem.dataset.title = song.title;
            listItem.dataset.artist = song.artist_name;
            listItem.addEventListener('click', () => handleSongSelection(song));
            songListUL.appendChild(listItem);
        });
    }

    // Handle song selection from the list
    function handleSongSelection(song) {
        if (!song || !song.song_id) {
            console.error("Invalid song object or missing song_id:", song);
            currentSongInfoDiv.textContent = 'Error: Invalid song data.';
            return;
        }
        
        console.log(`Selected song: ${song.title}, ID: ${song.song_id}`);

        audioPlayer.src = `${API_BASE_URL}/stream/${song.song_id}`;
        currentSongInfoDiv.innerHTML = `<p><strong>Title:</strong> ${song.title}</p>
                                        <p><strong>Artist:</strong> ${song.artist_name}</p>
                                        <p><strong>Album:</strong> ${song.album_title}</p>`;
        
        audioPlayer.play().catch(error => {
            console.error("Error playing audio:", error);
            currentSongInfoDiv.innerHTML += '<p style="color:red;">Error trying to play audio.</p>';
        });

        // Highlight active song
        Array.from(songListUL.children).forEach(li => {
            li.classList.remove('active-song');
            if (li.dataset.songId === song.song_id) {
                li.classList.add('active-song');
            }
        });
    }

    // Play/Pause button functionality
    playPauseButton.addEventListener('click', () => {
        if (audioPlayer.paused || audioPlayer.ended) {
            if (!audioPlayer.src) {
                alert("Please select a song first.");
                return;
            }
            audioPlayer.play().catch(error => console.error("Error playing audio via button:", error));
        } else {
            audioPlayer.pause();
        }
    });

    // Update Play/Pause button text based on audio events
    audioPlayer.addEventListener('play', () => {
        playPauseButton.textContent = 'Pause';
        console.log('Audio playing.');
    });

    audioPlayer.addEventListener('pause', () => {
        playPauseButton.textContent = 'Play';
        console.log('Audio paused.');
    });

    audioPlayer.addEventListener('ended', () => {
        playPauseButton.textContent = 'Play';
        console.log('Audio ended.');
        // Optional: Play next song or clear info
        // currentSongInfoDiv.textContent = 'Song finished. Select another song.';
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Error with audio element:', e);
        currentSongInfoDiv.innerHTML += `<p style="color:red;">Could not load or play the selected audio. Check console for details.</p>`;
        playPauseButton.textContent = 'Play'; // Reset button
    });


    // Initial fetch of songs
    fetchSongs();
});
