package com.example.offlineplayer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** One song: where the file lives, and a human-readable name. */
data class Song(val uri: Uri, val title: String)

/**
 * A named list of songs, optionally filed inside a folder.
 *
 * Songs are held as URI strings rather than [Song] objects so a playlist is
 * a list of *references*: renaming or re-reading a song touches one place,
 * and a song can sit in as many playlists as you like without being copied.
 * The order is the order you added them in — a playlist is a running order,
 * not a set, which is also why this is a List and not a Set.
 */
data class Playlist(
    val id: String,
    val name: String,
    val folderId: String?,
    val songUris: List<String>
)

/** A named group of playlists. Folders hold playlists, never songs directly. */
data class Folder(val id: String, val name: String)

/** The whole library in one value, so the UI can hold a single piece of state. */
data class LibraryData(
    val songs: List<Song> = emptyList(),
    val playlists: List<Playlist> = emptyList(),
    val folders: List<Folder> = emptyList()
) {
    /** Playlists filed in a folder, in name order. */
    fun playlistsIn(folderId: String): List<Playlist> =
        playlists.filter { it.folderId == folderId }.sortedBy { it.name.lowercase() }

    /** Playlists not filed anywhere. */
    fun loosePlaylists(): List<Playlist> =
        playlists.filter { it.folderId == null }.sortedBy { it.name.lowercase() }

    fun playlist(id: String): Playlist? = playlists.firstOrNull { it.id == id }
    fun folder(id: String): Folder? = folders.firstOrNull { it.id == id }

    /**
     * The songs of a playlist, in playlist order.
     *
     * A URI with no matching song is dropped rather than shown as a blank
     * row: it means the song was removed from the library while this
     * playlist still referenced it, and a playlist that quietly loses a
     * dead entry is better than one that tries to play nothing.
     */
    fun songsOf(playlist: Playlist): List<Song> {
        val byUri = songs.associateBy { it.uri.toString() }
        return playlist.songUris.mapNotNull { byUri[it] }
    }
}

/**
 * The library, and everything that persists between launches.
 *
 * Stored as one JSON document in SharedPreferences. The previous version kept
 * songs as a StringSet of "uri|||title" lines, which could not express a
 * playlist at all — a Set has no order, and there was nowhere to put a name
 * or a folder. Anything written by that version is migrated on first read
 * (see [migrateLegacy]), so an existing library survives the change.
 */
object Library {

    private const val PREFS = "song_library"
    private const val KEY_DATA = "library_json"
    private const val KEY_REPEAT = "repeat_mode"

    // The old format, read once and then left alone.
    private const val LEGACY_KEY_SONGS = "songs"
    private const val LEGACY_SEP = "|||"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /* ---------------- reading and writing ---------------- */

    fun load(context: Context): LibraryData {
        val raw = prefs(context).getString(KEY_DATA, null)
            ?: return migrateLegacy(context)
        return try {
            parse(JSONObject(raw))
        } catch (_: Exception) {
            // A corrupt document is not worth crashing the app over on
            // launch; an empty library can at least be re-imported into.
            LibraryData()
        }
    }

    private fun save(context: Context, data: LibraryData): LibraryData {
        prefs(context).edit().putString(KEY_DATA, serialize(data).toString()).apply()
        return data
    }

    private fun parse(root: JSONObject): LibraryData {
        val songs = root.optJSONArray("songs")?.let { arr ->
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Song(Uri.parse(o.getString("uri")), o.getString("title"))
            }
        } ?: emptyList()

        val folders = root.optJSONArray("folders")?.let { arr ->
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Folder(o.getString("id"), o.getString("name"))
            }
        } ?: emptyList()

        val playlists = root.optJSONArray("playlists")?.let { arr ->
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                val uris = o.optJSONArray("songUris")?.let { u ->
                    (0 until u.length()).map { j -> u.getString(j) }
                } ?: emptyList()
                Playlist(
                    id = o.getString("id"),
                    name = o.getString("name"),
                    folderId = if (o.isNull("folderId")) null else o.getString("folderId"),
                    songUris = uris
                )
            }
        } ?: emptyList()

        // A playlist pointing at a folder that no longer exists becomes loose
        // rather than invisible — it would otherwise be listed nowhere.
        val folderIds = folders.map { it.id }.toSet()
        val repaired = playlists.map {
            if (it.folderId != null && it.folderId !in folderIds) it.copy(folderId = null) else it
        }
        return LibraryData(songs.sortedBy { it.title.lowercase() }, repaired, folders)
    }

    private fun serialize(data: LibraryData): JSONObject {
        val songs = JSONArray()
        data.songs.forEach {
            songs.put(JSONObject().put("uri", it.uri.toString()).put("title", it.title))
        }
        val folders = JSONArray()
        data.folders.forEach {
            folders.put(JSONObject().put("id", it.id).put("name", it.name))
        }
        val playlists = JSONArray()
        data.playlists.forEach { p ->
            val uris = JSONArray()
            p.songUris.forEach { uris.put(it) }
            playlists.put(
                JSONObject()
                    .put("id", p.id)
                    .put("name", p.name)
                    .put("folderId", p.folderId ?: JSONObject.NULL)
                    .put("songUris", uris)
            )
        }
        return JSONObject()
            .put("songs", songs)
            .put("folders", folders)
            .put("playlists", playlists)
    }

    /**
     * Reads a library written by the StringSet version and rewrites it in the
     * new shape. Runs once: after this the JSON document exists, so [load]
     * never comes back here. The old key is left in place rather than deleted,
     * so downgrading loses the playlists but not the songs.
     */
    private fun migrateLegacy(context: Context): LibraryData {
        val raw = prefs(context).getStringSet(LEGACY_KEY_SONGS, emptySet()) ?: emptySet()
        val songs = raw.mapNotNull { line ->
            val parts = line.split(LEGACY_SEP, limit = 2)
            if (parts.size == 2) Song(Uri.parse(parts[0]), parts[1]) else null
        }.sortedBy { it.title.lowercase() }
        return save(context, LibraryData(songs = songs))
    }

    /* ---------------- songs ---------------- */

    fun addSongs(context: Context, uris: List<Uri>): LibraryData {
        val data = load(context)
        val known = data.songs.map { it.uri.toString() }.toMutableSet()
        val added = data.songs.toMutableList()

        for (uri in uris) {
            // Keep the right to read this file forever, not just today.
            try {
                context.contentResolver.takePersistableUriPermission(
                    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            } catch (_: SecurityException) {
                // Some pickers don't grant persistable permissions; skip those.
                continue
            }
            if (known.add(uri.toString())) added.add(Song(uri, displayName(context, uri)))
        }
        return save(context, data.copy(songs = added.sortedBy { it.title.lowercase() }))
    }

    /**
     * Removes a song from the library, and from every playlist referencing it
     * — a playlist holding a song the library no longer has would be a row
     * that cannot be played.
     */
    fun removeSong(context: Context, song: Song): LibraryData {
        val data = load(context)
        val key = song.uri.toString()
        return save(
            context,
            data.copy(
                songs = data.songs.filterNot { it.uri.toString() == key },
                playlists = data.playlists.map { it.copy(songUris = it.songUris - key) }
            )
        )
    }

    /* ---------------- folders ---------------- */

    fun createFolder(context: Context, name: String): LibraryData {
        val data = load(context)
        return save(context, data.copy(folders = data.folders + Folder(newId(), name.trim())))
    }

    fun renameFolder(context: Context, id: String, name: String): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            folders = data.folders.map { if (it.id == id) it.copy(name = name.trim()) else it }
        ))
    }

    /**
     * Deletes a folder. The playlists inside it are kept and become loose —
     * deleting a shelf should not burn the books on it.
     */
    fun deleteFolder(context: Context, id: String): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            folders = data.folders.filterNot { it.id == id },
            playlists = data.playlists.map { if (it.folderId == id) it.copy(folderId = null) else it }
        ))
    }

    /* ---------------- playlists ---------------- */

    fun createPlaylist(context: Context, name: String, folderId: String? = null): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            playlists = data.playlists + Playlist(newId(), name.trim(), folderId, emptyList())
        ))
    }

    fun renamePlaylist(context: Context, id: String, name: String): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            playlists = data.playlists.map { if (it.id == id) it.copy(name = name.trim()) else it }
        ))
    }

    fun deletePlaylist(context: Context, id: String): LibraryData {
        val data = load(context)
        return save(context, data.copy(playlists = data.playlists.filterNot { it.id == id }))
    }

    /** Files a playlist into a folder, or out of every folder when null. */
    fun movePlaylist(context: Context, id: String, folderId: String?): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            playlists = data.playlists.map { if (it.id == id) it.copy(folderId = folderId) else it }
        ))
    }

    /** Appends songs, skipping any the playlist already holds. */
    fun addToPlaylist(context: Context, playlistId: String, uris: List<String>): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            playlists = data.playlists.map { p ->
                if (p.id != playlistId) p
                else p.copy(songUris = p.songUris + uris.filterNot { it in p.songUris })
            }
        ))
    }

    fun removeFromPlaylist(context: Context, playlistId: String, uri: String): LibraryData {
        val data = load(context)
        return save(context, data.copy(
            playlists = data.playlists.map { p ->
                if (p.id == playlistId) p.copy(songUris = p.songUris - uri) else p
            }
        ))
    }

    /* ---------------- repeat mode ---------------- */

    /**
     * The loop setting outlives the player. ExoPlayer holds a repeat mode of
     * its own, but the service is torn down when playback ends and the app is
     * swiped away, so without this the choice would silently reset to off.
     */
    fun loadRepeatMode(context: Context): Int = prefs(context).getInt(KEY_REPEAT, 0)

    fun saveRepeatMode(context: Context, mode: Int) {
        prefs(context).edit().putInt(KEY_REPEAT, mode).apply()
    }

    /* ---------------- helpers ---------------- */

    private fun newId(): String = UUID.randomUUID().toString()

    /** Ask Android what the file is actually called, e.g. "MySong.mp3". */
    private fun displayName(context: Context, uri: Uri): String {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                return cursor.getString(idx).substringBeforeLast('.')
            }
        }
        return "Unknown track"
    }
}
