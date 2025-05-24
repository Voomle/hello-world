# import_music.py
# This script handles importing music data into the system.

import json
import os

def add_album(artist_name: str, album_title: str, release_year: int, songs: list, album_art_url: str = None):
    """
    Adds a new album to an artist's collection or creates a new artist file if one doesn't exist.

    Args:
        artist_name (str): The name of the artist.
        album_title (str): The title of the album.
        release_year (int): The release year of the album.
        songs (list): A list of song dictionaries. Each song should have:
                      'song_id' (str), 'title' (str), 
                      'duration_seconds' (int), 'file_path' (str).
        album_art_url (str, optional): The URL or path to the album art. Defaults to None.
    """
    # Generate a slugified artist name for the filename (replace spaces with underscores, lowercase)
    artist_filename_slug = artist_name.lower().replace(" ", "_")
    artist_json_path = f"{artist_filename_slug}.json"

    artist_data = {
        "artist_name": artist_name,
        "albums": []
    }

    # Check if the artist's JSON file already exists
    if os.path.exists(artist_json_path):
        try:
            with open(artist_json_path, 'r') as f:
                artist_data = json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: Could not decode JSON from {artist_json_path}. Starting with a new structure.")
            # Initialize with default structure if file is corrupted or empty
            artist_data = {
                "artist_name": artist_name,
                "albums": []
            }
        except Exception as e:
            print(f"An error occurred reading {artist_json_path}: {e}. Starting with a new structure.")
            # Initialize with default structure for other read errors
            artist_data = {
                "artist_name": artist_name,
                "albums": []
            }
    else:
        print(f"No existing data found for {artist_name}. Creating new file: {artist_json_path}")

    # Ensure artist_name in loaded data matches the input, or update if it's a new/empty file
    if artist_data.get("artist_name") != artist_name :
        print(f"Updating artist name in data structure to {artist_name}")
        artist_data["artist_name"] = artist_name
    
    if "albums" not in artist_data: # Ensure 'albums' key exists
        artist_data["albums"] = []

    # Check for duplicate album titles
    for album in artist_data["albums"]:
        if album.get("album_title") == album_title:
            print(f"Album '{album_title}' already exists for {artist_name}. Skipping addition.")
            return

    # Create the new album dictionary
    new_album = {
        "album_title": album_title,
        "release_year": release_year,
        "album_art_url": album_art_url if album_art_url else f"images/{album_title.lower().replace(' ', '_')}_album_art.png", # Default art path
        "songs": songs
    }

    # Add the new album to the artist's list of albums
    artist_data["albums"].append(new_album)

    # Write the updated artist data back to their JSON file
    try:
        with open(artist_json_path, 'w') as f:
            json.dump(artist_data, f, indent=2)
        print(f"Successfully added album '{album_title}' to {artist_json_path}.")
    except Exception as e:
        print(f"An error occurred writing to {artist_json_path}: {e}")

    # Placeholder for physical file handling logic
    # TODO: Implement logic to check for audio files in 'songs' and move/verify them.
    # For example, iterate through songs:
    # for song in songs:
    #     actual_file_path = os.path.join("audio_files", os.path.basename(song['file_path']))
    #     if not os.path.exists(actual_file_path):
    #         print(f"Warning: Audio file {actual_file_path} not found for song '{song['title']}'.")
    #     else:
    #         # Optionally, move file to a structured directory if needed
    #         pass
    print("Placeholder: Physical audio file checking/moving logic would go here.")


if __name__ == "__main__":
    print("Running import_music.py example...")

    # Example: Add a new album to "The Demo Tapes"
    demo_tapes_songs = [
        {
            "song_id": "dt002s01",
            "title": "Blueprint Ballad",
            "duration_seconds": 220,
            "file_path": "audio_files/blueprint_ballad.mp3"
        },
        {
            "song_id": "dt002s02",
            "title": "Component Chorus",
            "duration_seconds": 195,
            "file_path": "audio_files/component_chorus.mp3"
        }
    ]
    add_album(
        artist_name="The Demo Tapes",
        album_title="Constructs",
        release_year=2025,
        songs=demo_tapes_songs,
        album_art_url="images/constructs_album_art.png" # Example specific path
    )

    # Example: Add an album for a new artist
    new_artist_songs = [
        {
            "song_id": "na001s01",
            "title": "First Song",
            "duration_seconds": 180,
            "file_path": "audio_files/first_song.mp3"
        }
    ]
    add_album(
        artist_name="The Newcomers",
        album_title="Debut Works",
        release_year=2024,
        songs=new_artist_songs
        # Album art URL will use the default generated path
    )

    # Example: Attempt to add a duplicate album (should be skipped)
    add_album(
        artist_name="The Demo Tapes",
        album_title="Constructs", # This album was added above
        release_year=2025,
        songs=demo_tapes_songs
    )
    print("Example finished.")
