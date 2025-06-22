import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
//  Configuration & Initialization
// ============================================================================

// --- AsyncStorage Keys ---
const TRACK_DB_KEY = '@Musox:trackDatabase';
const PLAYLIST_DB_KEY = '@Musox:playlistDatabase';
const DAILY_STATS_KEY_PREFIX = '@Musox:dailyStats_';

// --- File System Directories ---
const BASE_DIR = FileSystem.documentDirectory + 'musox/';
const SONGS_DIR = BASE_DIR + 'songs/';
const THUMBNAILS_DIR = BASE_DIR + 'thumbnails/';
const LYRICS_DIR = BASE_DIR + 'lyrics/';

/**
 * Ensures that all necessary storage directories exist.
 * This should be called once when the app starts.
 */
export const initializeStorage = async () => {
    await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true });
    await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, { intermediates: true });
    await FileSystem.makeDirectoryAsync(LYRICS_DIR, { intermediates: true });
    console.log('[Storage] All storage directories are initialized.');
};

// ============================================================================
//  Track Database & Asset Management
// ============================================================================

/**
 * Retrieves the entire track database from AsyncStorage.
 * @returns {Promise<Object>} An object where keys are track IDs.
 */
export const getDownloadedTracks = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(TRACK_DB_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : {};
  } catch (e) {
    console.error('Failed to fetch track database.', e);
    return {};
  }
};

/**
 * Adds a track to the database after saving its assets to the file system.
 * This is the main function to call after a successful download.
 * @param {object} trackMetadata - The full details of the track from Spotify/backend.
 * @param {object} assets - The raw data for the files.
 * @param {string} assets.songData - The base64 encoded webm file.
 * @param {string} assets.thumbnailData - The base64 encoded png/jpg file.
 * @param {string} assets.lrcData - The string content of the lrc file.
 */
export const addDownloadedTrack = async (trackMetadata, assets) => {
    const trackId = trackMetadata.id;
    if (!trackId || !assets.songData) {
        console.error("Cannot save track without a trackId and songData.");
        return;
    }

    const songUri = SONGS_DIR + `${trackId}.webm`;
    const thumbnailUri = THUMBNAILS_DIR + `${trackId}.png`;
    const lrcUri = LYRICS_DIR + `${trackId}.lrc`;

    try {
        // 1. Write all assets to their respective directories
        await FileSystem.writeAsStringAsync(songUri, assets.songData, { encoding: FileSystem.EncodingType.Base64 });
        if (assets.thumbnailData) {
            await FileSystem.writeAsStringAsync(thumbnailUri, assets.thumbnailData, { encoding: FileSystem.EncodingType.Base64 });
        }
        if (assets.lrcData) {
            await FileSystem.writeAsStringAsync(lrcUri, assets.lrcData, { encoding: FileSystem.EncodingType.UTF8 });
        }
        console.log(`[Storage] Assets saved for track: ${trackId}`);

        // 2. Update the metadata database in AsyncStorage
        const existingTracks = await getDownloadedTracks();
        const existingStats = existingTracks[trackId] || { playCount: 0, totalPlayTime: 0 };
        
        const newTrackRecord = {
            ...trackMetadata,
            fileUri: songUri, // Store the URI to the local file
            thumbnailUri: assets.thumbnailData ? thumbnailUri : null,
            lrcUri: assets.lrcData ? lrcUri : null,
            playCount: existingStats.playCount,
            totalPlayTime: existingStats.totalPlayTime,
            downloadedAt: new Date().toISOString(),
        };

        const updatedTracks = {
            ...existingTracks,
            [trackId]: newTrackRecord,
        };

        await AsyncStorage.setItem(TRACK_DB_KEY, JSON.stringify(updatedTracks));
        console.log(`[Storage] Track metadata saved to DB for: ${trackMetadata.name}`);

    } catch (e) {
        console.error('Failed to save track assets or update DB.', e);
    }
};

// ============================================================================
//  Playlist Database Management
// ============================================================================

export const getPlaylists = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(PLAYLIST_DB_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch playlists.', e);
    return [];
  }
};

export const createPlaylist = async (name) => {
  if (!name.trim()) return null;
  try {
    const existingPlaylists = await getPlaylists();
    const newPlaylist = {
      id: uuidv4(),
      name: name.trim(),
      trackIds: [],
      createdAt: new Date().toISOString(),
    };
    const updatedPlaylists = [...existingPlaylists, newPlaylist];
    await AsyncStorage.setItem(PLAYLIST_DB_KEY, JSON.stringify(updatedPlaylists));
    return newPlaylist;
  } catch (e) {
    console.error('Failed to create playlist.', e);
    return null;
  }
};

export const addTrackToPlaylist = async (playlistId, trackId) => {
  try {
    const playlists = await getPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);
    if (playlistIndex === -1) throw new Error(`Playlist ${playlistId} not found.`);
    if (!playlists[playlistIndex].trackIds.includes(trackId)) {
      playlists[playlistIndex].trackIds.push(trackId);
    }
    await AsyncStorage.setItem(PLAYLIST_DB_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.error('Failed to add track to playlist.', e);
  }
};

export const getPlaylistWithTracks = async (playlistId) => {
    try {
        const playlists = await getPlaylists();
        const downloadedTracks = await getDownloadedTracks();
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) return null;
        
        const resolvedTracks = playlist.trackIds.map(trackId => downloadedTracks[trackId]).filter(Boolean);
        return { ...playlist, tracks: resolvedTracks };
    } catch(e) {
        console.error('Failed to get playlist with tracks.', e);
        return null;
    }
};

// ============================================================================
//  Playback Logging
// ============================================================================

export const logSongPlay = async (trackId) => {
    if (!trackId) return;
    try {
        const allTracks = await getDownloadedTracks();
        const track = allTracks[trackId];

        if (track) {
            // 1. Update Master Track List
            track.playCount = (track.playCount || 0) + 1;
            track.totalPlayTime = (track.totalPlayTime || 0) + (track.duration_ms || 0);
            allTracks[trackId] = track;
            await AsyncStorage.setItem(TRACK_DB_KEY, JSON.stringify(allTracks));

            // 2. Update Daily Stats
            const today = new Date().toISOString().split('T')[0];
            const dailyStatsKey = `${DAILY_STATS_KEY_PREFIX}${today}`;
            const dailyStatsJson = await AsyncStorage.getItem(dailyStatsKey);
            const dailyStats = dailyStatsJson ? JSON.parse(dailyStatsJson) : {};

            const dailyTrackStats = dailyStats[trackId] || { playCount: 0, totalPlayTime: 0 };
            dailyTrackStats.playCount += 1;
            dailyTrackStats.totalPlayTime += (track.duration_ms || 0);
            dailyStats[trackId] = dailyTrackStats;
            await AsyncStorage.setItem(dailyStatsKey, JSON.stringify(dailyStats));
            
            console.log(`[Storage] Logged play for '${track.name}'`);
        }
    } catch (e) {
        console.error(`Failed to log play for track ${trackId}:`, e);
    }
};