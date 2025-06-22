/**
 * @file api.js
 * @description Centralized API service for the Musox application.
 * This file manages all communication with the Firebase backend and downloader services.
 */

// ============================================================================
// Configuration
// ============================================================================
const FIREBASE_BASE_URL = 'https://us-central1-musox-v2.cloudfunctions.net';
const CLOUDFLARE_DOWNLOADER_URL = 'https://f85a8dfd-musox-downloader.musox.workers.dev/download';

// ============================================================================
// Client-Side Logic (from your provided .js files)
// These would typically be in their own files and imported.
// ============================================================================

const getSanityKey = async () => {
  const apiKeyUrl = 'https://api.mp3youtube.cc/v2/sanity/key';
  const headers = { 'Origin': 'https://iframe.y2meta-uk.com' };
  const response = await fetch(apiKeyUrl, { method: 'GET', headers });
  if (!response.ok) throw new Error(`Keygen API failed: ${response.status}`);
  const data = await response.json();
  if (!data.key) throw new Error('Key not found in response');
  return data.key;
};

const startConversion = async (videoId, key) => {
  const converterUrl = 'https://api.mp3youtube.cc/v2/converter';
  const headers = { 'key': key, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://iframe.y2meta-uk.com' };
  const body = new URLSearchParams({ link: `https://youtu.be/${videoId}`, format: 'mp3' }).toString();

  const converterResponse = await fetch(converterUrl, { method: 'POST', headers, body });
  if (!converterResponse.ok) throw new Error(`Converter API failed: ${converterResponse.status}`);
  const tunnelData = await converterResponse.json();
  if (tunnelData.status !== 'tunnel' || !tunnelData.url) {
    throw new Error('Conversion did not return a valid download URL.');
  }
  return { downloadUrl: tunnelData.url, fileName: tunnelData.filename };
};

// ============================================================================
// API Service Abstractions
// ============================================================================

/**
 * A helper function to process JSON responses from our Firebase backend.
 * It expects a { success: boolean, data/error: ... } format.
 */
const handleBackendResponse = async (response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    if (json.success) {
        return json.data;
    }
    throw new Error(json.error || 'An unknown backend error occurred');
};

/**
 * Searches Spotify for a track.
 * @param {string} query The search term.
 */
export const searchSpotify = (query) => {
    return fetch(`${FIREBASE_BASE_URL}/searchByString?q=${encodeURIComponent(query)}`).then(handleBackendResponse);
};

/**
 * Enqueues a Spotify album for background processing.
 * @param {string} albumUrl The full URL of the Spotify album.
 */
export const processAlbum = (albumUrl) => {
    return fetch(`${FIREBASE_BASE_URL}/processSpotifyAlbum?url=${encodeURIComponent(albumUrl)}`).then(handleBackendResponse);
};

/**
 * Enqueues a Spotify playlist for background processing.
 * @param {string} playlistUrl The full URL of the Spotify playlist.
 */
export const processPlaylist = (playlistUrl) => {
    return fetch(`${FIREBASE_BASE_URL}/processSpotifyPlaylist?url=${encodeURIComponent(playlistUrl)}`).then(handleBackendResponse);
};

/**
 * Enqueues a custom batch of track IDs for background processing.
 * @param {string[]} trackIds An array of Spotify track IDs.
 */
export const processTrackBatch = (trackIds) => {
    return fetch(`${FIREBASE_BASE_URL}/processBatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_ids: trackIds })
    }).then(handleBackendResponse);
};

/**
 * Gets the processing status and cached data for a batch of up to 30 tracks.
 * @param {string[]} trackIds An array of Spotify track IDs.
 */
export const getTrackDetails = (trackIds) => {
    return fetch(`${FIREBASE_BASE_URL}/getTrackDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_ids: trackIds })
    }).then(handleBackendResponse);
};

/**
 * Gets recommendations from the backend. The backend will return a list of track IDs.
 * @param {string[]} seedTrackIds An array of 1-5 Spotify track IDs.
 */
export const getBackendRecommendations = (seedTrackIds) => {
    return fetch(`${FIREBASE_BASE_URL}/getBatchRecommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_track_ids: seedTrackIds })
    }).then(handleBackendResponse);
};

/**
 * Gets a list of potential YouTube videos for manual verification.
 * @param {string} trackId The Spotify track ID.
 */
export const getManualVerificationList = (trackId) => {
    return fetch(`${FIREBASE_BASE_URL}/getManualVerificationList?trackId=${trackId}`).then(handleBackendResponse);
};

/**
 * Manually links a YouTube video to a Spotify track in the database.
 * @param {string} trackId The Spotify Track ID.
 * @param {string} videoId The YouTube Video ID.
 */
export const linkYouTubeToSpotify = (trackId, videoId) => {
    return fetch(`${FIREBASE_BASE_URL}/linkYouTubeToSpotify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, videoId })
    }).then(handleBackendResponse);
};

/**
 * Automatically finds and links a Spotify track for a given YouTube video.
 * @param {string} videoId 
 * @param {string} title 
 * @param {string} artist 
 */
export const autoLinkYouTubeToSpotify = (videoId, title, artist) => {
    return fetch(`${FIREBASE_BASE_URL}/autoLinkYouTubeToSpotify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, title, artist })
    }).then(handleBackendResponse);
};

/**
 * Orchestrates downloading a track by trying the primary client-side method first,
 * then falling back to the Cloudflare worker.
 * @param {string} videoId The YouTube video ID.
 * @returns {Promise<{downloadUrl: string, fileName?: string}>}
 */
export const getDownloadInfo = async (videoId) => {
    console.log(`[Download] Starting for videoId: ${videoId}`);
    try {
        console.log('[Download] Attempting Primary Method (Client-side converter)...');
        const key = await getSanityKey();
        const conversionInfo = await startConversion(videoId, key);
        console.log('[Download] Primary Method Successful!');
        return conversionInfo;
    } catch (error) {
        console.warn(`[Download] Primary Method Failed: ${error.message}. Triggering fallback.`);
        try {
            console.log('[Download] Attempting Fallback Method (Cloudflare worker)...');
            const response = await fetch(CLOUDFLARE_DOWNLOADER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId }),
            });
            if (!response.ok) throw new Error('Fallback downloader service also failed');
            console.log('[Download] Fallback Method Successful!');
            return response.json();
        } catch (fallbackError) {
            console.error(`[Download] Fallback Method Failed: ${fallbackError.message}`);
            throw new Error('All download methods failed.');
        }
    }
};
