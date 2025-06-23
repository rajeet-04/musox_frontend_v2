import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { getDownloadedTracks, logSongPlay } from './storage';
import { downloadAndStoreTrack } from './downloader';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const soundRef = useRef(new Audio.Sound());

  useEffect(() => {
    const configureAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
    };
    configureAudio();

    const soundInstance = soundRef.current;
    soundInstance.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

    return () => {
      soundInstance?.unloadAsync();
    };
  }, []);

  const onPlaybackStatusUpdate = (status) => {
    setPlaybackStatus(status);
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        playNextTrack();
      }
    } else {
      if (status.error) {
        console.error(`Playback Error: ${status.error}`);
        clearTrack();
      }
    }
  };

  const loadAndPlay = async (track) => {
    try {
        const soundInstance = soundRef.current;
        const status = await soundInstance.getStatusAsync();
        if (status.isLoaded) {
            await soundInstance.unloadAsync();
        }

        await soundInstance.loadAsync({ uri: track.fileUri }, { shouldPlay: true });
        setCurrentTrack(track);
        await logSongPlay(track.id);
    } catch (e) {
        console.error("Failed to load and play track", e);
    }
  };

  const playTrack = async (trackObject, tracklist = []) => {
    const trackId = trackObject.id;
    if (!trackId) {
        console.error("Track ID is missing.");
        return;
    }

    const newQueue = tracklist.length > 0 ? tracklist : [trackObject];
    const newIndex = newQueue.findIndex(t => t.id === trackId);
    
    setQueue(newQueue);
    setQueueIndex(newIndex !== -1 ? newIndex : 0);

    try {
        const localTracks = await getDownloadedTracks();
        const localTrackData = localTracks[trackId];

        if (localTrackData?.fileUri) {
          await loadAndPlay(localTrackData);
        } else {
          downloadAndStoreTrack(trackId, async (success) => {
            if (success) {
              const newTrackData = (await getDownloadedTracks())[trackId];
              if (newTrackData) await loadAndPlay(newTrackData);
            } else {
              console.error(`Download failed for track: ${trackObject.name}`);
            }
          });
        }
    } catch (e) {
        console.error("Error in playTrack:", e);
    }
  };

  const pauseTrack = async () => {
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded && status.isPlaying) {
      await soundRef.current.pauseAsync();
    }
  };

  const resumeTrack = async () => {
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded && !status.isPlaying) {
      await soundRef.current.playAsync();
    }
  };
  
  const seekTrack = async (positionMillis) => {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
          await soundRef.current.setPositionAsync(positionMillis);
      }
  };

  const playNextTrack = async () => {
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      const nextTrack = queue[nextIndex];
      setQueueIndex(nextIndex);
      await playTrack(nextTrack, queue);
    } else {
      console.log("End of queue.");
      clearTrack();
    }
  };

  const playPreviousTrack = async () => {
    if (queue.length > 0 && queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      const prevTrack = queue[prevIndex];
      setQueueIndex(prevIndex);
      await playTrack(prevTrack, queue);
    } else {
      console.log("Start of queue, seeking to 0.");
      seekTrack(0);
    }
  };

  const clearTrack = async () => {
    await soundRef.current.unloadAsync();
    setCurrentTrack(null);
    setIsPlaying(false);
    setPlaybackStatus(null);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playbackStatus,
        queue,
        queueIndex,
        playTrack,
        pauseTrack,
        resumeTrack,
        clearTrack,
        seekTrack,
        playNextTrack,
        playPreviousTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
