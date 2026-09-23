package com.example.offlineplayer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player

/**
 * What the loop button looks like and says in each of its three states.
 *
 * Off / all / one is the standard three-way cycle rather than a plain on-off
 * toggle, because "loop" means two different things — keep the queue going
 * round, or hold on this one track — and a single switch cannot say which.
 * The icon carries the difference and the label under it spells it out, so
 * the current state is readable without tapping to find out.
 */
private data class RepeatLook(val icon: ImageVector, val label: String, val active: Boolean)

private fun lookFor(mode: Int): RepeatLook = when (mode) {
    Player.REPEAT_MODE_ALL -> RepeatLook(Icons.Default.Repeat, "Repeat all", true)
    Player.REPEAT_MODE_ONE -> RepeatLook(Icons.Default.RepeatOne, "Repeat one", true)
    else -> RepeatLook(Icons.Default.Repeat, "Repeat off", false)
}

/**
 * The bar pinned to the bottom of every library screen while something is
 * loaded. Tapping the bar itself opens [NowPlayingScreen]; the buttons on the
 * right stay live so the common case — pause, skip — never costs a trip into
 * another screen.
 */
@Composable
fun NowPlayingBar(player: PlayerHandle, onOpen: () -> Unit) {
    if (!player.hasTrack) return
    Surface(tonalElevation = 3.dp) {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onOpen)
                .padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.MusicNote,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    player.title ?: "",
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    if (player.isPlaying) "Playing" else "Paused",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = player.playPause) {
                Icon(
                    if (player.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (player.isPlaying) "Pause" else "Play"
                )
            }
            IconButton(onClick = player.next) {
                Icon(Icons.Default.SkipNext, contentDescription = "Next")
            }
        }
    }
}

/** The full player: what is playing, and every control for it. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NowPlayingScreen(player: PlayerHandle, onBack: () -> Unit) {
    val repeat = lookFor(player.repeatMode)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Now playing") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Back to library")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.weight(1f))

            Box(
                Modifier
                    .size(200.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.MusicNote,
                    contentDescription = null,
                    modifier = Modifier.size(88.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(Modifier.height(32.dp))

            Text(
                player.title ?: "Nothing loaded",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(8.dp))
            Text(
                if (player.isPlaying) "Playing" else "Paused",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(40.dp))

            // Previous / play-pause / next, with play-pause given the weight
            // it earns by being the one people reach for without looking.
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = player.previous, modifier = Modifier.size(56.dp)) {
                    Icon(
                        Icons.Default.SkipPrevious,
                        contentDescription = "Previous",
                        modifier = Modifier.size(36.dp)
                    )
                }
                Spacer(Modifier.width(16.dp))
                Surface(
                    onClick = player.playPause,
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(76.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            if (player.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (player.isPlaying) "Pause" else "Play",
                            modifier = Modifier.size(40.dp),
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
                Spacer(Modifier.width(16.dp))
                IconButton(onClick = player.next, modifier = Modifier.size(56.dp)) {
                    Icon(
                        Icons.Default.SkipNext,
                        contentDescription = "Next",
                        modifier = Modifier.size(36.dp)
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            // Stop and loop, each labelled — neither is a control you want to
            // guess at, and loop in particular has three states to tell apart.
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Top
            ) {
                LabelledControl(
                    icon = Icons.Default.Stop,
                    label = "Stop",
                    active = false,
                    onClick = player.stop
                )
                LabelledControl(
                    icon = repeat.icon,
                    label = repeat.label,
                    active = repeat.active,
                    onClick = player.cycleRepeat
                )
            }

            Spacer(Modifier.weight(1f))
            Spacer(Modifier.height(24.dp))
        }
    }
}

/**
 * An icon button with its meaning written under it, tinted when the setting
 * it controls is switched on.
 */
@Composable
private fun LabelledControl(
    icon: ImageVector,
    label: String,
    active: Boolean,
    onClick: () -> Unit
) {
    val tint =
        if (active) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.onSurfaceVariant

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(onClick = onClick, modifier = Modifier.size(48.dp)) {
            Icon(icon, contentDescription = label, modifier = Modifier.size(28.dp), tint = tint)
        }
        Text(label, style = MaterialTheme.typography.labelMedium, color = tint)
    }
}
