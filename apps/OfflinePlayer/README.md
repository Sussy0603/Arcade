# Offline Player

A simple offline music player for Android. Import audio files from your phone, play them with no internet, and the music keeps playing when the screen is off (with lock-screen and headphone controls).

## How to get it on your phone

You only need to do this setup once.

### 1. Install Android Studio
Download it free from https://developer.android.com/studio and install it with the default options. First launch will download some extra components — let it finish.

### 2. Open this project
In Android Studio: **File → Open**, then select the `OfflinePlayer` folder (the one containing this README). Wait for the bottom status bar to finish "Gradle sync" — the first time takes several minutes because it downloads the build tools.

### 3. Put your phone in developer mode
On your Android phone:
1. Open **Settings → About phone**
2. Tap **Build number** seven times ("You are now a developer!")
3. Go to **Settings → System → Developer options**
4. Turn on **USB debugging**

### 4. Run it
1. Plug your phone into the computer with a USB cable
2. On the phone, allow the "USB debugging" popup
3. In Android Studio, your phone's name appears in the device dropdown at the top
4. Press the green **▶ Run** button

The app installs and opens on your phone. After this, it stays installed like any other app — no cable needed.

## Using the app

### Getting music in
- Tap **+** to import audio files (mp3, m4a, opus, flac...) from your phone's storage
- **All songs** holds everything you have imported. Tap a song to play; the whole list becomes the queue

### Playing
- While something is loaded, a bar sits at the bottom of every screen with the track name, play/pause and next
- **Tap that bar** to open the full player: the track name, previous / play / pause / next, **Stop**, and **Loop**
- **Stop** is not pause — it ends playback and puts the track back at its beginning, ready to start again
- **Loop** cycles through three settings, and the label under it always says which one you are on:
  - *Repeat off* — the queue plays through and finishes
  - *Repeat all* — the queue starts again from the top
  - *Repeat one* — the current track repeats until you change it
  - Your choice is remembered between launches
- Music keeps playing with the screen off; controls appear on the lock screen and in the notification shade
- Previous / play-pause / next work from the app, the notification, and headphone buttons

### Playlists and folders
- A **playlist** is a list of songs, in the order you added them. A song can be in as many playlists as you like
- A **folder** holds playlists — it is a way to group them, and it never holds songs directly
- From the library screen: **New folder** and **New playlist**
- Add songs to a playlist from either end — the **+** inside a playlist, or a song's **⋮ → Add to playlist**
- A playlist's **⋮** menu renames it, moves it into (or out of) a folder, or deletes it
- Playing a song from inside a playlist queues *that playlist*, not your whole library

Nothing here deletes audio from your phone. Removing a song from a playlist leaves it in your library;
removing it from the library leaves the file where it is on disk. Deleting a folder keeps the playlists
that were inside it — they move out of any folder rather than being deleted with it.

## What's inside (for the curious)
- `PlaybackService.kt` — the background service that keeps music alive when the screen is off
- `Library.kt` — the songs, playlists and folders, and everything that persists between launches
- `MainActivity.kt` — the player connection, and which screen you are on
- `LibraryScreens.kt` — the browsing screens: library, all songs, folder, playlist, and their dialogs
- `NowPlayingScreen.kt` — the bottom bar, and the full player behind it
