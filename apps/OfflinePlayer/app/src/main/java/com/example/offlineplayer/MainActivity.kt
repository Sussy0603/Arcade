package com.example.offlineplayer

import android.Manifest
import android.content.ComponentName
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.*
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors

/**
 * Where you are in the app.
 *
 * A short stack of these replaces a navigation library: there are five
 * destinations and no deep links, so a list plus BackHandler is the whole of
 * it, and it keeps the app's single dependency list as short as it is.
 */
sealed interface Screen {
    data object Library : Screen
    data object AllSongs : Screen
    data class FolderView(val id: String) : Screen
    data class PlaylistView(val id: String) : Screen
    data object NowPlaying : Screen
}

/**
 * Everything the UI needs from the player: what it is doing, and how to tell
 * it to do something else.
 *
 * Passed down as one value so the screens never touch the MediaController
 * directly — they cannot then get into a state the service disagrees with,
 * and each screen stays a plain function of its arguments.
 */
data class PlayerHandle(
    val connected: Boolean,
    val isPlaying: Boolean,
    val title: String?,
    val hasTrack: Boolean,
    val repeatMode: Int,
    val playPause: () -> Unit,
    val stop: () -> Unit,
    val next: () -> Unit,
    val previous: () -> Unit,
    val cycleRepeat: () -> Unit
)

class MainActivity : ComponentActivity() {

    private var controller: MediaController? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // On Android 13+ we ask permission to show the playback notification.
        // Music plays either way, but the notification gives lock-screen controls.
        if (Build.VERSION.SDK_INT >= 33) {
            registerForActivityResult(ActivityResultContracts.RequestPermission()) {}
                .launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                PlayerApp()
            }
        }
    }

    @Composable
    fun PlayerApp() {
        var library by remember { mutableStateOf(Library.load(this)) }
        var connected by remember { mutableStateOf(false) }
        var isPlaying by remember { mutableStateOf(false) }
        var nowPlaying by remember { mutableStateOf<String?>(null) }
        var hasTrack by remember { mutableStateOf(false) }
        var repeatMode by remember { mutableIntStateOf(Library.loadRepeatMode(this)) }

        val backStack = remember { mutableStateListOf<Screen>(Screen.Library) }
        val screen = backStack.last()

        fun go(next: Screen) { backStack.add(next) }
        fun back() { if (backStack.size > 1) backStack.removeAt(backStack.lastIndex) }

        // The system back gesture follows the same stack, so backing out of the
        // player returns to the list rather than leaving the app.
        BackHandler(enabled = backStack.size > 1) { back() }

        // Connect to the background PlaybackService when the screen opens.
        LaunchedEffect(Unit) {
            val token = SessionToken(
                this@MainActivity,
                ComponentName(this@MainActivity, PlaybackService::class.java)
            )
            val future = MediaController.Builder(this@MainActivity, token).buildAsync()
            future.addListener({
                val c = future.get()
                controller = c
                connected = true
                // One callback, and it re-reads everything from the player.
                //
                // The per-property callbacks are a trap here. Listening to
                // onIsPlayingChanged alone left the UI stuck on "Playing"
                // after Stop: stop() puts the player in STATE_IDLE, and the
                // screen kept its old value while the session reported
                // state=NONE — a pause button that would not pause, because
                // as far as the UI knew nothing had happened.
                //
                // onEvents fires once after any batch of changes, so reading
                // the whole of the state out of the player here means the two
                // cannot drift whatever the cause: stop, an error, the end of
                // the queue, or another app taking over the session.
                fun sync(p: Player) {
                    isPlaying = p.isPlaying
                    nowPlaying = p.currentMediaItem?.mediaMetadata?.title?.toString()
                    hasTrack = p.currentMediaItem != null
                    repeatMode = p.repeatMode
                }
                // The saved loop setting is ours, not the player's, and it has
                // to go in BEFORE anything is read back out.
                //
                // Order matters and is the whole of this line's reason for
                // being here rather than three lines further down: a service
                // started fresh reports repeat off, so syncing first would
                // overwrite the setting just loaded from disk with that
                // default — the choice survived in storage and vanished from
                // the screen on every cold start.
                c.repeatMode = repeatMode

                c.addListener(object : Player.Listener {
                    override fun onEvents(player: Player, events: Player.Events) = sync(player)
                })
                // Restore "now playing" state if music was already going.
                sync(c)
            }, MoreExecutors.directExecutor())
        }

        val picker = rememberLauncherForActivityResult(
            ActivityResultContracts.OpenMultipleDocuments()
        ) { uris ->
            if (uris.isNotEmpty()) library = Library.addSongs(this, uris)
        }

        /** Makes [songs] the queue and starts at [index]. */
        fun playQueue(songs: List<Song>, index: Int) {
            val c = controller ?: return
            if (songs.isEmpty()) return
            val items = songs.map { song ->
                MediaItem.Builder()
                    .setUri(song.uri)
                    .setMediaId(song.uri.toString())
                    .setMediaMetadata(MediaMetadata.Builder().setTitle(song.title).build())
                    .build()
            }
            c.setMediaItems(items, index.coerceIn(0, items.lastIndex), 0L)
            c.prepare()
            c.play()
        }

        val player = PlayerHandle(
            connected = connected,
            isPlaying = isPlaying,
            title = nowPlaying,
            hasTrack = hasTrack,
            repeatMode = repeatMode,
            playPause = {
                val c = controller
                if (c != null) {
                    if (c.isPlaying) {
                        c.pause()
                    } else {
                        // Stop() leaves the player idle, so a play after a stop
                        // has to prepare again before it will make a sound.
                        if (c.playbackState == Player.STATE_IDLE) c.prepare()
                        c.play()
                    }
                }
            },
            stop = {
                // A real stop, not a pause: playback ends and the track goes
                // back to its beginning, ready to start again from the top.
                //
                // seekTo(positionMs), not seekTo(index, positionMs) — the
                // two-argument form takes the *queue* back to its first track,
                // so stopping halfway down a playlist silently threw away your
                // place in it. Stop should reset the track, not the queue.
                controller?.let { c ->
                    c.stop()
                    c.seekTo(0L)
                }
            },
            next = { controller?.seekToNext() },
            previous = { controller?.seekToPrevious() },
            cycleRepeat = {
                val nextMode = when (repeatMode) {
                    Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
                    Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
                    else -> Player.REPEAT_MODE_OFF
                }
                repeatMode = nextMode
                controller?.repeatMode = nextMode
                Library.saveRepeatMode(this, nextMode)
            }
        )

        when (screen) {
            is Screen.NowPlaying -> NowPlayingScreen(player = player, onBack = { back() })

            is Screen.Library -> LibraryScreen(
                data = library,
                player = player,
                onImport = { picker.launch(arrayOf("audio/*")) },
                onOpenAllSongs = { go(Screen.AllSongs) },
                onOpenFolder = { go(Screen.FolderView(it.id)) },
                onOpenPlaylist = { go(Screen.PlaylistView(it.id)) },
                onCreateFolder = { library = Library.createFolder(this, it) },
                onCreatePlaylist = { library = Library.createPlaylist(this, it, null) },
                onOpenNowPlaying = { go(Screen.NowPlaying) }
            )

            is Screen.AllSongs -> AllSongsScreen(
                data = library,
                player = player,
                onBack = { back() },
                onImport = { picker.launch(arrayOf("audio/*")) },
                onPlay = { index -> playQueue(library.songs, index) },
                onRemove = { library = Library.removeSong(this, it) },
                onAddToPlaylist = { playlistId, uris ->
                    library = Library.addToPlaylist(this, playlistId, uris)
                },
                onOpenNowPlaying = { go(Screen.NowPlaying) }
            )

            is Screen.FolderView -> {
                val folder = library.folder(screen.id)
                // The folder can vanish under us — deleted from its own screen,
                // which pops back here. Falling back to the library beats
                // rendering a screen with no subject.
                if (folder == null) {
                    LaunchedEffect(screen.id) { back() }
                } else {
                    FolderScreen(
                        folder = folder,
                        data = library,
                        player = player,
                        onBack = { back() },
                        onOpenPlaylist = { go(Screen.PlaylistView(it.id)) },
                        onCreatePlaylist = { library = Library.createPlaylist(this, it, folder.id) },
                        onRename = { library = Library.renameFolder(this, folder.id, it) },
                        onDelete = {
                            library = Library.deleteFolder(this, folder.id)
                            back()
                        },
                        onOpenNowPlaying = { go(Screen.NowPlaying) }
                    )
                }
            }

            is Screen.PlaylistView -> {
                val playlist = library.playlist(screen.id)
                if (playlist == null) {
                    LaunchedEffect(screen.id) { back() }
                } else {
                    PlaylistScreen(
                        playlist = playlist,
                        data = library,
                        player = player,
                        onBack = { back() },
                        onPlay = { index -> playQueue(library.songsOf(playlist), index) },
                        onAddSongs = { uris ->
                            library = Library.addToPlaylist(this, playlist.id, uris)
                        },
                        onRemoveSong = { uri ->
                            library = Library.removeFromPlaylist(this, playlist.id, uri)
                        },
                        onRename = { library = Library.renamePlaylist(this, playlist.id, it) },
                        onMoveToFolder = { library = Library.movePlaylist(this, playlist.id, it) },
                        onDelete = {
                            library = Library.deletePlaylist(this, playlist.id)
                            back()
                        },
                        onOpenNowPlaying = { go(Screen.NowPlaying) }
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        controller?.release()
        controller = null
        super.onDestroy()
    }
}
