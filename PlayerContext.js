import React, { createContext, useState, useContext } from 'react';

// 1. Create the Context
const PlayerContext = createContext();

// 2. Create a custom hook for easy access to the context
export const usePlayer = () => useContext(PlayerContext);

// 3. Create the Provider component
export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Functions to control the player
  const playTrack = (track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const resumeTrack = () => {
    if (currentTrack) {
      setIsPlaying(true);
    }
  };

  const clearTrack = () => {
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  const value = {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    resumeTrack,
    clearTrack,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};