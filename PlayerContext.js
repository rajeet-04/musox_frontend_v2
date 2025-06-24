import React, { createContext, useState, useContext, useRef, useEffect, useMemo } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

import { Alert } from 'react-native';
import * as storage from './storage';
import DownloadManager from './downloader';

// The contexts are split for performance:
// PlayerContext holds stable data and functions.
// PlaybackStatusContext holds frequently updated status objects.
const PlayerContext = createContext();
const PlaybackStatusContext = createContext(null);

export const usePlayer = () => useContext(PlayerContext);
export const usePlaybackStatus = () => useContext(PlaybackStatusContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false); // State to track play/pause status
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const soundRef = useRef(new Audio.Sound());

  // --- Core Setup ---

  useEffect(() => {
    // Configure audio settings for the app
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false
    });

    // Attach the status update listener
    soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

    // Cleanup function to unload the sound when the provider is unmounted
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  /**
   * This is the central function that receives status updates from the audio object.
   * It is the single source of truth for the playback state.
   */
  const onPlaybackStatusUpdate = (status) => {
    setPlaybackStatus(status); // Update the detailed status context
    if (status.isLoaded) {
      // Update the simple isPlaying state for UI components
      setIsPlaying(status.isPlaying);
      // Automatically play the next track if the current one finished
      if (status.didJustFinish) {
        playNextTrack();
      }
    } else {
      // If no track is loaded, it's not playing
      setIsPlaying(false);
    }
  };

  // --- Internal Playback Functions ---

  /**
   * Loads a track into the player and starts playback.
   * This is used for internal navigation (e.g., next/previous).
   */
  const loadAndPlay = async (track) => {
    if (!track?.fileUri) {
        console.error("Cannot play track: file URI is missing.", track);
        return;
    }
    try {
      await soundRef.current.unloadAsync();
      await soundRef.current.loadAsync({ uri: track.fileUri }, { shouldPlay: true });
      setCurrentTrack(track);
      await storage.logSongPlay(track.id);
    } catch (e) {
      console.error("Failed to load and play track", e);
      Alert.alert("Playback Error", "Could not play the selected track.");
    }
  };

  // --- Public Control Functions ---

  /**
   * The main function to start playback from a list of tracks.
   * It checks if the track is downloaded and plays it, or queues it for download.
   */
  const playTrack = async (trackObject, tracklist = []) => {
    if (!trackObject?.id) return;

    const localTracks = await storage.getDownloadedTracks();
    const localTrackData = localTracks[trackObject.id];
    console.log( localTrackData)
    if (localTrackData?.fileUri) {
      // Set the current queue and position
      const newQueue = tracklist.length > 0 ? tracklist : [localTrackData];
      const newIndex = newQueue.findIndex(t => t.id === trackObject.id);
      setQueue(newQueue);
      setQueueIndex(newIndex);
      // Load and play the track
      await loadAndPlay(localTrackData);
    } else {
      // If not downloaded, add to the download queue and notify the user
      Alert.alert(
        "Track Queued for Download",
        `"${trackObject.name}" will be downloaded. You can check the progress in the Downloads tab.`
      );
      await DownloadManager.enqueueTrack(trackObject);
    }
  };
  
  const pauseTrack = async () => {
    if ((await soundRef.current.getStatusAsync()).isLoaded) {
      await soundRef.current.pauseAsync();
    }
  };

  const resumeTrack = async () => {
    if ((await soundRef.current.getStatusAsync()).isLoaded) {
      await soundRef.current.playAsync();
    }
  };

  const seekTrack = async (positionMillis) => {
    if ((await soundRef.current.getStatusAsync()).isLoaded) {
      await soundRef.current.setPositionAsync(positionMillis);
    }
  };

  const playNextTrack = async () => {
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      await loadAndPlay(queue[nextIndex]);
    } else {
      await soundRef.current.unloadAsync();
      setCurrentTrack(null);
    }
  };

  const playPreviousTrack = async () => {
    const status = await soundRef.current.getStatusAsync();
    // If track has been playing for < 3s and it's not the first track, go to previous.
    // Otherwise, restart the current track.
    if (status.isLoaded && status.positionMillis < 3000 && queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      await loadAndPlay(queue[prevIndex]);
    } else {
      await seekTrack(0);
    }
  };

  /**
   * The value provided to the PlayerContext. We use useMemo to prevent
   * unnecessary re-renders of consumer components.
   */
  const playerContextValue = useMemo(() => ({
    currentTrack,
    queue,
    isPlaying, // Provide the isPlaying state to consumers
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTrack,
    playNextTrack,
    playPreviousTrack,
  }), [currentTrack, queue, isPlaying]); // Add isPlaying to dependency array

  return (
    <PlayerContext.Provider value={playerContextValue}>
      <PlaybackStatusContext.Provider value={playbackStatus}>
        {children}
      </PlaybackStatusContext.Provider>
    </PlayerContext.Provider>
  );
};
