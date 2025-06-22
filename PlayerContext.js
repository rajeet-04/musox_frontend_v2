import React, { createContext, useState, useContext, useRef } from 'react';
import { Audio } from 'expo-av';
import { getDownloadedTracks } from './storage';
import { downloadAndStoreTrack } from './downloader';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);

  const loadAndPlay = async (track) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: track.fileUri },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );
    soundRef.current = sound;
    setIsPlaying(true);
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  };

  const playTrack = async (spotifyTrack) => {
    const trackId = spotifyTrack.id;
    const localTracks = await getDownloadedTracks();

    if (localTracks[trackId]?.fileUri) {
      console.log('[Player] Track found locally. Playing:', spotifyTrack.name);
      const track = localTracks[trackId];
      setCurrentTrack(track);
      await loadAndPlay(track);
    } else {
      console.log('[Player] Track not found locally. Downloading:', spotifyTrack.name);
      await downloadAndStoreTrack(trackId, async (success) => {
        if (success) {
          const updated = await getDownloadedTracks();
          const newTrack = updated[trackId];
          setCurrentTrack(newTrack);
          await loadAndPlay(newTrack);
        } else {
          console.error('[Player] Download failed or track could not be saved.');
        }
      });
    }
  };

  const pauseTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const resumeTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const clearTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playTrack,
        pauseTrack,
        resumeTrack,
        clearTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
