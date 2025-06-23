import React, { createContext, useState, useContext, useRef, useEffect, useMemo } from 'react';
import { Audio } from 'expo-av';
import { getDownloadedTracks, logSongPlay } from './storage';
import { downloadAndStoreTrack } from './downloader';

// Context for player controls and stable state
const PlayerContext = createContext();
// A separate context for the frequently updating playback status
const PlaybackStatusContext = createContext();

export const usePlayer = () => useContext(PlayerContext);
export const usePlaybackStatus = () => useContext(PlaybackStatusContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const soundRef = useRef(new Audio.Sound());

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
    
    soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) console.error(`Playback Error: ${status.error}`);
      // When unloaded, reset status
      if (playbackStatus != null) setPlaybackStatus(null);
      return;
    }
    setPlaybackStatus(status);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      playNextTrack();
    }
  };

  const loadAndPlay = async (track) => {
    try {
      await soundRef.current.unloadAsync();
      await soundRef.current.loadAsync({ uri: track.fileUri }, { shouldPlay: true, progressUpdateIntervalMillis: 500 });
      setCurrentTrack(track);
      await logSongPlay(track.id);
    } catch (e) {
      console.error("Failed to load and play track", e);
    }
  };

  const playTrack = async (trackObject, tracklist = []) => {
    const trackId = trackObject.id;
    if (!trackId) return;

    const newQueue = tracklist.length > 0 ? tracklist : [trackObject];
    const newIndex = newQueue.findIndex(t => t.id === trackId);

    setQueue(newQueue);
    setQueueIndex(newIndex);

    const localTracks = await getDownloadedTracks();
    const localTrackData = localTracks[trackId];

    if (localTrackData?.fileUri) {
      await loadAndPlay(localTrackData);
    } else {
      downloadAndStoreTrack(trackId, async (success) => {
        if (success) {
          const newTrackData = (await getDownloadedTracks())[trackId];
          if (newTrackData) await loadAndPlay(newTrackData);
        }
      });
    }
  };
  
  const pauseTrack = async () => {
    if ((await soundRef.current.getStatusAsync()).isLoaded) await soundRef.current.pauseAsync();
  };

  const resumeTrack = async () => {
     if ((await soundRef.current.getStatusAsync()).isLoaded) await soundRef.current.playAsync();
  };
  
  const seekTrack = async (positionMillis) => {
      if ((await soundRef.current.getStatusAsync()).isLoaded) await soundRef.current.setPositionAsync(positionMillis);
  };

  const playNextTrack = async () => {
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      await playTrack(queue[nextIndex], queue);
    } else {
      clearTrack();
    }
  };

  const playPreviousTrack = async () => {
    if (queue.length > 0 && queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      await playTrack(queue[prevIndex], queue);
    } else {
      seekTrack(0);
    }
  };

  const clearTrack = async () => {
    await soundRef.current.unloadAsync();
    setCurrentTrack(null);
    setIsPlaying(false);
    setPlaybackStatus(null);
  };

  // Memoize the stable context value. Note: playbackStatus is NOT in the dependency array.
  const playerContextValue = useMemo(() => ({
    currentTrack,
    isPlaying,
    queue,
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTrack,
    playNextTrack,
    playPreviousTrack,
  }), [currentTrack, isPlaying, queue]);

  return (
    <PlayerContext.Provider value={playerContextValue}>
        <PlaybackStatusContext.Provider value={playbackStatus}>
            {children}
        </PlaybackStatusContext.Provider>
    </PlayerContext.Provider>
  );
};
