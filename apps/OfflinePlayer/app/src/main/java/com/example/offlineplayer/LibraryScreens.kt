package com.example.offlineplayer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
// The mirrored set: these four flip direction in a right-to-left layout,
// which the plain Filled versions do not. The compiler deprecates the
// unmirrored ones by name, so this is its own advice taken.
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.automirrored.filled.QueueMusic
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/* ══════════════════════════════════════════════════════════════════════
   Library — the top level: every song, the folders, and the playlists
   that are not in a folder.
   ══════════════════════════════════════════════════════════════════════ */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    data: LibraryData,
    player: PlayerHandle,
    onImport: () -> Unit,
    onOpenAllSongs: () -> Unit,
    onOpenFolder: (Folder) -> Unit,
    onOpenPlaylist: (Playlist) -> Unit,
    onCreateFolder: (String) -> Unit,
    onCreatePlaylist: (String) -> Unit,
    onOpenNowPlaying: () -> Unit
) {
    var naming by remember { mutableStateOf<NameRequest?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Offline Player") },
                actions = {
                    IconButton(onClick = onImport) {
                        Icon(Icons.Default.Add, contentDescription = "Import songs")
                    }
                }
            )
        },
        bottomBar = { NowPlayingBar(player, onOpenNowPlaying) }
    ) { padding ->
        LazyColumn(Modifier.padding(padding)) {

            item {
                ListItem(
                    headlineContent = { Text("All songs") },
                    supportingContent = { Text(countLabel(data.songs.size, "song")) },
                    leadingContent = { Icon(Icons.Default.LibraryMusic, null) },
                    modifier = Modifier.clickable(onClick = onOpenAllSongs)
                )
                HorizontalDivider()
            }

            item { SectionHeader("Folders", "New folder") { naming = NameRequest.NewFolder } }

            if (data.folders.isEmpty()) {
                item { EmptyNote("No folders yet. A folder holds playlists.") }
            } else {
                items(data.folders.sortedBy { it.name.lowercase() }, key = { it.id }) { folder ->
                    ListItem(
                        headlineContent = { Text(folder.name) },
                        supportingContent = {
                            Text(countLabel(data.playlistsIn(folder.id).size, "playlist"))
                        },
                        leadingContent = { Icon(Icons.Default.Folder, null) },
                        modifier = Modifier.clickable { onOpenFolder(folder) }
                    )
                    HorizontalDivider()
                }
            }

            item { SectionHeader("Playlists", "New playlist") { naming = NameRequest.NewPlaylist } }

            val loose = data.loosePlaylists()
            if (loose.isEmpty()) {
                item { EmptyNote("No playlists outside a folder.") }
            } else {
                items(loose, key = { it.id }) { playlist ->
                    PlaylistRow(playlist, data) { onOpenPlaylist(playlist) }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    naming?.let { request ->
        NameDialog(
            title = if (request is NameRequest.NewFolder) "New folder" else "New playlist",
            initial = "",
            confirmLabel = "Create",
            onDismiss = { naming = null },
            onConfirm = { name ->
                if (request is NameRequest.NewFolder) onCreateFolder(name) else onCreatePlaylist(name)
                naming = null
            }
        )
    }
}

private sealed interface NameRequest {
    data object NewFolder : NameRequest
    data object NewPlaylist : NameRequest
}

/* ══════════════════════════════════════════════════════════════════════
   All songs — everything imported. Playing here queues the whole library.
   ══════════════════════════════════════════════════════════════════════ */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AllSongsScreen(
    data: LibraryData,
    player: PlayerHandle,
    onBack: () -> Unit,
    onImport: () -> Unit,
    onPlay: (Int) -> Unit,
    onRemove: (Song) -> Unit,
    onAddToPlaylist: (String, List<String>) -> Unit,
    onOpenNowPlaying: () -> Unit
) {
    var addingToPlaylist by remember { mutableStateOf<Song?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("All songs") },
                navigationIcon = { BackButton(onBack) },
                actions = {
                    IconButton(onClick = onImport) {
                        Icon(Icons.Default.Add, contentDescription = "Import songs")
                    }
                }
            )
        },
        bottomBar = { NowPlayingBar(player, onOpenNowPlaying) }
    ) { padding ->
        if (data.songs.isEmpty()) {
            EmptyState(
                title = "No songs yet",
                body = "Tap + to import audio files from your phone",
                actionLabel = "Import songs",
                onAction = onImport,
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(Modifier.padding(padding)) {
                itemsIndexed(data.songs, key = { _, s -> s.uri.toString() }) { index, song ->
                    ListItem(
                        headlineContent = {
                            Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        },
                        leadingContent = { Icon(Icons.Default.MusicNote, null) },
                        trailingContent = {
                            RowMenu(
                                items = listOf(
                                    MenuAction("Add to playlist", Icons.Default.Add) {
                                        addingToPlaylist = song
                                    },
                                    MenuAction("Remove from library", Icons.Default.Delete) {
                                        onRemove(song)
                                    }
                                )
                            )
                        },
                        modifier = Modifier.clickable(enabled = player.connected) { onPlay(index) }
                    )
                    HorizontalDivider()
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    addingToPlaylist?.let { song ->
        ChoosePlaylistDialog(
            data = data,
            onDismiss = { addingToPlaylist = null },
            onChosen = { playlist ->
                onAddToPlaylist(playlist.id, listOf(song.uri.toString()))
                addingToPlaylist = null
            }
        )
    }
}

/* ══════════════════════════════════════════════════════════════════════
   Folder — the playlists filed inside one folder.
   ══════════════════════════════════════════════════════════════════════ */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FolderScreen(
    folder: Folder,
    data: LibraryData,
    player: PlayerHandle,
    onBack: () -> Unit,
    onOpenPlaylist: (Playlist) -> Unit,
    onCreatePlaylist: (String) -> Unit,
    onRename: (String) -> Unit,
    onDelete: () -> Unit,
    onOpenNowPlaying: () -> Unit
) {
    var creating by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var confirmingDelete by remember { mutableStateOf(false) }

    val playlists = data.playlistsIn(folder.id)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(folder.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { BackButton(onBack) },
                actions = {
                    IconButton(onClick = { creating = true }) {
                        Icon(Icons.Default.Add, contentDescription = "New playlist")
                    }
                    RowMenu(
                        items = listOf(
                            MenuAction("Rename folder", Icons.Default.Edit) { renaming = true },
                            MenuAction("Delete folder", Icons.Default.Delete) {
                                confirmingDelete = true
                            }
                        )
                    )
                }
            )
        },
        bottomBar = { NowPlayingBar(player, onOpenNowPlaying) }
    ) { padding ->
        if (playlists.isEmpty()) {
            EmptyState(
                title = "Empty folder",
                body = "Playlists you put in ${folder.name} appear here",
                actionLabel = "New playlist",
                onAction = { creating = true },
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(Modifier.padding(padding)) {
                items(playlists, key = { it.id }) { playlist ->
                    PlaylistRow(playlist, data) { onOpenPlaylist(playlist) }
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    if (creating) {
        NameDialog(
            title = "New playlist",
            initial = "",
            confirmLabel = "Create",
            onDismiss = { creating = false },
            onConfirm = { onCreatePlaylist(it); creating = false }
        )
    }
    if (renaming) {
        NameDialog(
            title = "Rename folder",
            initial = folder.name,
            confirmLabel = "Rename",
            onDismiss = { renaming = false },
            onConfirm = { onRename(it); renaming = false }
        )
    }
    if (confirmingDelete) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text("Delete ${folder.name}?") },
            // Said plainly, because "delete folder" reads like it takes the
            // playlists with it. It does not.
            text = {
                Text(
                    if (playlists.isEmpty()) "The folder is empty."
                    else "${countLabel(playlists.size, "playlist")} inside will be kept, " +
                        "and moved out of any folder."
                )
            },
            confirmButton = {
                TextButton(onClick = { confirmingDelete = false; onDelete() }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { confirmingDelete = false }) { Text("Cancel") }
            }
        )
    }
}

/* ══════════════════════════════════════════════════════════════════════
   Playlist — its songs, in order. Playing here queues just this playlist.
   ══════════════════════════════════════════════════════════════════════ */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaylistScreen(
    playlist: Playlist,
    data: LibraryData,
    player: PlayerHandle,
    onBack: () -> Unit,
    onPlay: (Int) -> Unit,
    onAddSongs: (List<String>) -> Unit,
    onRemoveSong: (String) -> Unit,
    onRename: (String) -> Unit,
    onMoveToFolder: (String?) -> Unit,
    onDelete: () -> Unit,
    onOpenNowPlaying: () -> Unit
) {
    var adding by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var moving by remember { mutableStateOf(false) }
    var confirmingDelete by remember { mutableStateOf(false) }

    val songs = data.songsOf(playlist)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(playlist.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { BackButton(onBack) },
                actions = {
                    IconButton(onClick = { adding = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Add songs")
                    }
                    RowMenu(
                        items = listOf(
                            MenuAction("Rename playlist", Icons.Default.Edit) { renaming = true },
                            MenuAction("Move to folder", Icons.AutoMirrored.Filled.DriveFileMove) {
                                moving = true
                            },
                            MenuAction("Delete playlist", Icons.Default.Delete) {
                                confirmingDelete = true
                            }
                        )
                    )
                }
            )
        },
        bottomBar = { NowPlayingBar(player, onOpenNowPlaying) }
    ) { padding ->
        if (songs.isEmpty()) {
            EmptyState(
                title = "Empty playlist",
                body = "Add songs from your library to ${playlist.name}",
                actionLabel = "Add songs",
                onAction = { adding = true },
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(Modifier.padding(padding)) {
                itemsIndexed(songs, key = { _, s -> s.uri.toString() }) { index, song ->
                    ListItem(
                        headlineContent = {
                            Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        },
                        leadingContent = { Icon(Icons.Default.MusicNote, null) },
                        trailingContent = {
                            RowMenu(
                                items = listOf(
                                    // Only from the playlist. The song stays in
                                    // the library and in any other playlist.
                                    MenuAction("Remove from playlist", Icons.Default.Close) {
                                        onRemoveSong(song.uri.toString())
                                    }
                                )
                            )
                        },
                        modifier = Modifier.clickable(enabled = player.connected) { onPlay(index) }
                    )
                    HorizontalDivider()
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    if (adding) {
        ChooseSongsDialog(
            data = data,
            alreadyIn = playlist.songUris.toSet(),
            onDismiss = { adding = false },
            onConfirm = { uris -> onAddSongs(uris); adding = false }
        )
    }
    if (renaming) {
        NameDialog(
            title = "Rename playlist",
            initial = playlist.name,
            confirmLabel = "Rename",
            onDismiss = { renaming = false },
            onConfirm = { onRename(it); renaming = false }
        )
    }
    if (moving) {
        ChooseFolderDialog(
            data = data,
            current = playlist.folderId,
            onDismiss = { moving = false },
            onChosen = { folderId -> onMoveToFolder(folderId); moving = false }
        )
    }
    if (confirmingDelete) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text("Delete ${playlist.name}?") },
            text = { Text("The songs stay in your library.") },
            confirmButton = {
                TextButton(onClick = { confirmingDelete = false; onDelete() }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { confirmingDelete = false }) { Text("Cancel") }
            }
        )
    }
}

/* ══════════════════════════════════════════════════════════════════════
   Dialogs
   ══════════════════════════════════════════════════════════════════════ */

/** Create or rename. The confirm button stays dead until there is a name. */
@Composable
fun NameDialog(
    title: String,
    initial: String,
    confirmLabel: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var text by remember { mutableStateOf(initial) }
    // The dialog has exactly one field and no other reason to exist, so it
    // takes the cursor itself and brings the keyboard with it. Without this
    // the field opens unfocused: you tap "New playlist", type, and nothing
    // happens until you have tapped the box as well.
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                singleLine = true,
                label = { Text("Name") },
                modifier = Modifier.focusRequester(focus)
            )
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(text) },
                enabled = text.isNotBlank()
            ) { Text(confirmLabel) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

/** Pick one playlist — used by "Add to playlist" on a song. */
@Composable
fun ChoosePlaylistDialog(
    data: LibraryData,
    onDismiss: () -> Unit,
    onChosen: (Playlist) -> Unit
) {
    val all = data.playlists.sortedBy { it.name.lowercase() }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add to playlist") },
        text = {
            if (all.isEmpty()) {
                Text("No playlists yet. Make one from the library screen first.")
            } else {
                LazyColumn(Modifier.heightIn(max = 360.dp)) {
                    items(all, key = { it.id }) { playlist ->
                        ListItem(
                            headlineContent = { Text(playlist.name) },
                            supportingContent = {
                                val where = playlist.folderId?.let { data.folder(it)?.name }
                                Text(if (where != null) "in $where" else "not in a folder")
                            },
                            leadingContent = { Icon(Icons.AutoMirrored.Filled.QueueMusic, null) },
                            modifier = Modifier.clickable { onChosen(playlist) }
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

/**
 * Pick any number of songs to add to a playlist. Songs already in it are
 * listed but locked, so it is obvious they are there rather than missing.
 */
@Composable
fun ChooseSongsDialog(
    data: LibraryData,
    alreadyIn: Set<String>,
    onDismiss: () -> Unit,
    onConfirm: (List<String>) -> Unit
) {
    val chosen = remember { mutableStateListOf<String>() }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add songs") },
        text = {
            if (data.songs.isEmpty()) {
                Text("Your library is empty. Import some audio files first.")
            } else {
                LazyColumn(Modifier.heightIn(max = 380.dp)) {
                    items(data.songs, key = { it.uri.toString() }) { song ->
                        val uri = song.uri.toString()
                        val already = uri in alreadyIn
                        ListItem(
                            headlineContent = {
                                Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            },
                            supportingContent = if (already) {
                                { Text("Already in this playlist") }
                            } else null,
                            leadingContent = {
                                Checkbox(
                                    checked = already || uri in chosen,
                                    enabled = !already,
                                    onCheckedChange = { on ->
                                        if (on) chosen.add(uri) else chosen.remove(uri)
                                    }
                                )
                            },
                            modifier = Modifier.clickable(enabled = !already) {
                                if (uri in chosen) chosen.remove(uri) else chosen.add(uri)
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(chosen.toList()) },
                enabled = chosen.isNotEmpty()
            ) { Text(if (chosen.isEmpty()) "Add" else "Add ${chosen.size}") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

/** Pick a folder for a playlist, or take it out of every folder. */
@Composable
fun ChooseFolderDialog(
    data: LibraryData,
    current: String?,
    onDismiss: () -> Unit,
    onChosen: (String?) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Move to folder") },
        text = {
            LazyColumn(Modifier.heightIn(max = 360.dp)) {
                item {
                    ListItem(
                        headlineContent = { Text("No folder") },
                        leadingContent = {
                            RadioButton(selected = current == null, onClick = { onChosen(null) })
                        },
                        modifier = Modifier.clickable { onChosen(null) }
                    )
                }
                items(data.folders.sortedBy { it.name.lowercase() }, key = { it.id }) { folder ->
                    ListItem(
                        headlineContent = { Text(folder.name) },
                        leadingContent = {
                            RadioButton(
                                selected = current == folder.id,
                                onClick = { onChosen(folder.id) }
                            )
                        },
                        modifier = Modifier.clickable { onChosen(folder.id) }
                    )
                }
                if (data.folders.isEmpty()) {
                    item { EmptyNote("No folders yet. Make one from the library screen.") }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

/* ══════════════════════════════════════════════════════════════════════
   Small shared pieces
   ══════════════════════════════════════════════════════════════════════ */

data class MenuAction(
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val onClick: () -> Unit
)

/** The three-dot overflow used by rows and app bars. */
@Composable
fun RowMenu(items: List<MenuAction>) {
    var open by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }) {
            Icon(Icons.Default.MoreVert, contentDescription = "More")
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            items.forEach { action ->
                DropdownMenuItem(
                    text = { Text(action.label) },
                    leadingIcon = { Icon(action.icon, null) },
                    onClick = { open = false; action.onClick() }
                )
            }
        }
    }
}

@Composable
private fun PlaylistRow(playlist: Playlist, data: LibraryData, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(playlist.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
        supportingContent = { Text(countLabel(data.songsOf(playlist).size, "song")) },
        leadingContent = { Icon(Icons.AutoMirrored.Filled.QueueMusic, null) },
        modifier = Modifier.clickable(onClick = onClick)
    )
    HorizontalDivider()
}

@Composable
private fun SectionHeader(title: String, actionLabel: String, onAction: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 4.dp, top = 20.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.weight(1f)
        )
        TextButton(onClick = onAction) { Text(actionLabel) }
    }
}

@Composable
private fun EmptyNote(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    )
}

@Composable
private fun EmptyState(
    title: String,
    body: String,
    actionLabel: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = onAction) { Text(actionLabel) }
        }
    }
}

@Composable
private fun BackButton(onBack: () -> Unit) {
    IconButton(onClick = onBack) {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
    }
}

/** "1 song" / "4 songs" — plural without a resource file for two words. */
private fun countLabel(n: Int, noun: String): String =
    if (n == 1) "1 $noun" else "$n ${noun}s"
