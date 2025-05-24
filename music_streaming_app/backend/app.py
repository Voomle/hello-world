# app.py
# Main Flask application for the music streaming service backend.

import os
import json
from flask import Flask, jsonify, send_from_directory, abort

# Initialize Flask app
app = Flask(__name__)

# Define the base directory for artist JSON files and audio files
# app.py is in music_streaming_app/backend/
# JSON files are in music_streaming_app/backend/
# Audio files are in music_streaming_app/backend/audio_files/
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_FILES_DIR = os.path.join(DATA_DIR, "audio_files")

def get_all_artist_files():
    """Scans the DATA_DIR for .json files that could be artist data."""
    json_files = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            # Basic check: does it have an artist_name key?
            # More robust checks could be added if needed.
            # For now, we'll be optimistic or rely on naming conventions.
            # We exclude 'sample_artist_data.json' if it's not meant to be directly served
            # or handle it based on specific requirements.
            # For this task, we assume all other .json files are artist data.
            if filename != "sample_artist_data.json": # Example of exclusion
                 json_files.append(os.path.join(DATA_DIR, filename))
            elif filename == "sample_artist_data.json": # Or include it if it's a valid artist file
                # If sample_artist_data.json follows the same structure and should be included:
                # json_files.append(os.path.join(DATA_DIR, filename))
                # For now, let's assume the import script creates separate files like 'the_demo_tapes.json'
                pass


    # A practical approach: The import_music.py script creates files like "the_demo_tapes.json".
    # We should look for those.
    # If sample_artist_data.json is also a valid artist data file, it should be named accordingly
    # by the import script or we explicitly include it here.
    # For now, let's assume files are named after artists.
    
    # Corrected logic: list all json files in DATA_DIR
    # The import script will generate files like "the_demo_tapes.json"
    # and "the_newcomers.json"
    actual_artist_files = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            # Exclude sample_artist_data.json as it's a template/example, not actual artist data
            # unless it's explicitly meant to be served.
            # The task implies scanning for files like 'the_demo_tapes.json'.
            if filename not in ["sample_artist_data.json"]: # Filter out non-artist specific JSONs
                full_path = os.path.join(DATA_DIR, filename)
                # Optional: Add a check for 'artist_name' key
                try:
                    with open(full_path, 'r') as f_test:
                        content = json.load(f_test)
                        if "artist_name" in content and "albums" in content:
                            actual_artist_files.append(full_path)
                        else:
                            app.logger.warning(f"Skipping {filename}: missing 'artist_name' or 'albums' key.")
                except json.JSONDecodeError:
                    app.logger.error(f"Error decoding JSON from {filename}. Skipping.")
                except Exception as e:
                    app.logger.error(f"Error reading {filename}: {e}. Skipping.")
            
    return actual_artist_files


@app.route('/api/songs', methods=['GET'])
def get_songs():
    """Aggregates all songs from all artists."""
    all_songs = []
    artist_files = get_all_artist_files()

    for artist_file_path in artist_files:
        try:
            with open(artist_file_path, 'r') as f:
                artist_data = json.load(f)
            
            artist_name = artist_data.get("artist_name", "Unknown Artist")
            for album in artist_data.get("albums", []):
                album_title = album.get("album_title", "Unknown Album")
                for song in album.get("songs", []):
                    song_info = {
                        "song_id": song.get("song_id"),
                        "title": song.get("title"),
                        "artist_name": artist_name,
                        "album_title": album_title,
                        "duration_seconds": song.get("duration_seconds")
                        # "file_path": song.get("file_path") # Not typically exposed in a general song list
                    }
                    if song_info["song_id"] and song_info["title"]: # Basic validation
                        all_songs.append(song_info)
        except json.JSONDecodeError:
            app.logger.error(f"Error decoding JSON from {artist_file_path}. Skipping this file.")
        except Exception as e:
            app.logger.error(f"Error processing file {artist_file_path}: {e}. Skipping this file.")
            
    return jsonify(all_songs)

@app.route('/api/stream/<string:song_id>', methods=['GET'])
def stream_song(song_id):
    """Finds a song by ID and streams its audio file."""
    artist_files = get_all_artist_files()
    song_to_stream = None
    
    for artist_file_path in artist_files:
        try:
            with open(artist_file_path, 'r') as f:
                artist_data = json.load(f)
            
            for album in artist_data.get("albums", []):
                for song in album.get("songs", []):
                    if song.get("song_id") == song_id:
                        song_to_stream = song
                        break
                if song_to_stream:
                    break
            if song_to_stream:
                break
        except json.JSONDecodeError:
            app.logger.error(f"Error decoding JSON from {artist_file_path} while searching for song {song_id}.")
            continue # Move to the next file
        except Exception as e:
            app.logger.error(f"Error processing file {artist_file_path} for song {song_id}: {e}.")
            continue

    if song_to_stream and "file_path" in song_to_stream:
        # file_path is like "audio_files/initial_track.mp3"
        # We need the filename part: "initial_track.mp3"
        # send_from_directory expects the path relative to its 'directory' argument
        file_name = os.path.basename(song_to_stream["file_path"])
        
        # Ensure AUDIO_FILES_DIR is correctly defined and accessible
        if not os.path.isdir(AUDIO_FILES_DIR):
            app.logger.error(f"Audio files directory not found: {AUDIO_FILES_DIR}")
            return jsonify({"error": "Server configuration error: audio directory missing"}), 500

        # Check if the specific file exists
        if not os.path.exists(os.path.join(AUDIO_FILES_DIR, file_name)):
            app.logger.error(f"Audio file not found: {os.path.join(AUDIO_FILES_DIR, file_name)} for song_id {song_id}")
            return jsonify({"error": "Audio file not found on server"}), 404
            
        try:
            return send_from_directory(directory=AUDIO_FILES_DIR, path=file_name, as_attachment=False)
        except FileNotFoundError:
            # This catch might be redundant if os.path.exists is used above, but good for safety.
            app.logger.error(f"send_from_directory could not find file: {file_name} in {AUDIO_FILES_DIR}")
            abort(404, description="Audio file not found by send_from_directory.")
        except Exception as e:
            app.logger.error(f"Error sending file {file_name}: {e}")
            return jsonify({"error": "Error streaming file"}), 500
    else:
        return jsonify({"error": "Song not found or file path missing"}), 404

if __name__ == '__main__':
    # Make sure the audio_files directory exists, create if not (for local dev)
    if not os.path.exists(AUDIO_FILES_DIR):
        os.makedirs(AUDIO_FILES_DIR)
        app.logger.info(f"Created audio_files directory at {AUDIO_FILES_DIR}")

    app.run(debug=True, host='0.0.0.0', port=5000)
