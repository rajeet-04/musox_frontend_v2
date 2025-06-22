import React, { createContext, useState, useContext } from 'react';

const DownloadContext = createContext();

export const useDownload = () => useContext(DownloadContext);

export const DownloadProvider = ({ children }) => {
  const [downloadQueue, setDownloadQueue] = useState([]);

  const addToQueue = (track) => {
    setDownloadQueue(prevQueue => [...prevQueue, { ...track, progress: 0 }]);
  };

  const updateProgress = (trackId, progress) => {
    setDownloadQueue(prevQueue =>
      prevQueue.map(item =>
        item.id === trackId ? { ...item, progress } : item
      )
    );
  };

  const removeFromQueue = (trackId) => {
    setDownloadQueue(prevQueue => prevQueue.filter(item => item.id !== trackId));
  };

  const value = {
    downloadQueue,
    addToQueue,
    updateProgress,
    removeFromQueue,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};
