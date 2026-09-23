package com.example.offlineplayer

import androidx.media3.common.AudioAttributes
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * This service is the heart of the app.
 *
 * It owns the actual audio player (ExoPlayer) and wraps it in a MediaSession.
 * Because it runs as a *foreground service*, Android keeps it alive even when
 * the screen is off or you switch to another app. Media3 automatically shows
 * a playback notification with play/pause/next controls, and hooks up your
 * headphone buttons and lock screen controls for free.
 */
class PlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()

        val player = ExoPlayer.Builder(this)
            // Tell Android this is music: pauses politely for phone calls,
            // and resumes after. Also ducks/pauses for navigation prompts.
            .setAudioAttributes(AudioAttributes.DEFAULT, /* handleAudioFocus = */ true)
            // Pause automatically if headphones are unplugged
            // (so music doesn't blast out of the speaker on the bus)
            .setHandleAudioBecomingNoisy(true)
            .build()

        mediaSession = MediaSession.Builder(this, player).build()
    }

    // The UI connects to the player through this.
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? =
        mediaSession

    // If the user swipes the app away and nothing is playing, shut down cleanly.
    override fun onTaskRemoved(rootIntent: android.content.Intent?) {
        val player = mediaSession?.player
        if (player == null || !player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}
