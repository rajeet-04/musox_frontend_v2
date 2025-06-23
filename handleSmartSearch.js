import * as spotify from './spotify';
import * as api from './api';
import { Alert } from 'react-native';

const parseSpotifyUrl = (query) => {
  try {
    const url = new URL(query);
    if (url.hostname.includes('spotify.com')) {
      const [, type, id] = url.pathname.split('/');
      if (['track', 'album', 'playlist', 'artist'].includes(type) && id) {
        return { type, id };
      }
    }
  } catch (e) {}
  return { type: null, id: null };
};

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
        await api.processAlbum(query);
        setSearchResults({ tracks: { items: tracks } });
      } else if (type === 'playlist') {
        const tracks = await spotify.getPlaylist(id);
        await api.processPlaylist(query);
        setSearchResults({ tracks: { items: tracks } });
      } else if (type === 'artist') {
        // With the updated spotify.getArtist, this now fetches the complete artist object
        const completeArtistData = await spotify.getArtist(id);
        // The search results expect an 'items' array, so we wrap the single artist object in an array
        setSearchResults({ artists: { items: [completeArtistData] } });
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
