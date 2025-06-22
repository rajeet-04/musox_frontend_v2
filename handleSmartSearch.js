// This logic adds intelligence to the search bar in SearchScreen
// It detects Spotify URLs and calls respective backend APIs for instant processing

import * as spotify from './spotify';
import * as api from './api';

/**
 * Detects and parses Spotify URLs.
 * @param {string} query
 * @returns {{ type: 'track'|'album'|'playlist'|null, id: string|null }}
 */
const parseSpotifyUrl = (query) => {
  try {
    const url = new URL(query);
    if (url.hostname.includes('spotify.com')) {
      const [, type, id] = url.pathname.split('/');
      if (['track', 'album', 'playlist'].includes(type) && id) {
        return { type, id };
      }
    }
  } catch (e) {}
  return { type: null, id: null };
};

/**
 * Smart handler for search queries.
 * Calls Spotify search or backend processor depending on input.
 */
export const handleSmartSearch = async (query, setSearchResults, setIsLoading) => {
  const { type, id } = parseSpotifyUrl(query);

  if (!query.trim()) return;

  setIsLoading(true);
  setSearchResults(null);

  try {
    if (type && id) {
      if (type === 'track') {
        const track = await spotify.getTrack(id);
        await api.processTrackBatch([id]);
        setSearchResults({ tracks: { items: [track] } });
      } else if (type === 'album') {
        const tracks = await spotify.getAlbum(id);
        await api.processAlbum(query); // Send full URL
        setSearchResults({ tracks: { items: tracks } });
      } else if (type === 'playlist') {
        const tracks = await spotify.getPlaylist(id);
        await api.processPlaylist(query);
        setSearchResults({ tracks: { items: tracks } });
      }
    } else {
      const results = await spotify.search(query);
      setSearchResults(results);
    }
  } catch (error) {
    console.error('Smart Search failed:', error);
    Alert.alert('Error', 'Failed to process the search. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
