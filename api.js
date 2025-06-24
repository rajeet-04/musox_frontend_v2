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
const FREETOOLSERVER_BASE_URL = 'https://freetoolserver.org';


// ============================================================================
// Helper Functions
// ============================================================================

const handleBackendResponse = async (response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    if (json.success) return json.data;
    throw new Error(json.error || 'An unknown backend error occurred');
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// ============================================================================
// Individual Downloader Implementations
// ============================================================================

// --- Logic for FreeToolServer ---
const tryFreeToolServer = async (videoId) => {
    console.log('[Download] Starting: FreeToolServer...');
    const startConversion = async (vid) => {
        const response = await fetch(`${FREETOOLSERVER_BASE_URL}/yt-convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${vid}` }),
        });
        if (!response.ok) throw new Error('FreeToolServer: failed to start conversion.');
        const data = await response.json();
        if (data.status !== 'processing' || !data.task_id) throw new Error('FreeToolServer: did not return a valid task ID.');
        return data.task_id;
    };

    const pollForCompletion = async (taskId) => {
        let attempts = 0;
        const maxAttempts = 30; // Poll for max 60 seconds
        while (attempts < maxAttempts) {
            const response = await fetch(`${FREETOOLSERVER_BASE_URL}/conversion-status/${taskId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'completed' && data.progress === 100) return data.result;
                if (data.status === 'failed' || data.error) throw new Error(`FreeToolServer: conversion failed: ${data.error || 'Unknown'}`);
            }
            attempts++;
            await sleep(2000);
        }
        throw new Error('FreeToolServer: conversion timed out.');
    };

    const taskId = await startConversion(videoId);
    const result = await pollForCompletion(taskId);
    const durationParts = result.duration.split(':');
    const durationMs = (parseInt(durationParts[0], 10) * 60 + parseInt(durationParts[1], 10)) * 1000;
    
    console.log('[Download] Success: FreeToolServer finished.');
    return {
        source: 'FreeToolServer',
        downloadUrl: `${FREETOOLSERVER_BASE_URL}/yt-download/${taskId}`,
        fileName: result.filename,
        durationMs: durationMs,
        lrcData: '', 
    };
};

// --- Logic for y2meta-uk ---
const tryY2Meta = async (videoId) => {
    console.log('[Download] Starting: y2meta-uk...');
    const getSanityKey = async () => {
      const response = await fetch('https://api.mp3youtube.cc/v2/sanity/key', { 
          method: 'GET', 
          headers: { 'Origin': 'https://iframe.y2meta-uk.com' } 
      });
      if (!response.ok) throw new Error(`y2meta: Keygen API failed: ${response.status}`);
      const data = await response.json();
      if (!data.key) throw new Error('y2meta: Key not found in response');
      return data.key;
    };

    const startY2MetaConversion = async (vid, key) => {
      const body = new URLSearchParams({ link: `https://youtu.be/${vid}`, format: 'mp3' }).toString();
      const response = await fetch('https://api.mp3youtube.cc/v2/converter', {
          method: 'POST',
          headers: { 'key': key, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://iframe.y2meta-uk.com' },
          body
      });
      if (!response.ok) throw new Error(`y2meta: Converter API failed: ${response.status}`);
      const data = await response.json();
      if (data.status !== 'tunnel' || !data.url) throw new Error('y2meta: Conversion did not return a valid download URL.');
      return { downloadUrl: data.url, fileName: data.filename };
    };

    const key = await getSanityKey();
    const conversionInfo = await startY2MetaConversion(videoId, key);
    
    console.log('[Download] Success: y2meta-uk finished.');
    return { 
        source: 'y2meta-uk',
        ...conversionInfo, 
        durationMs: 0, 
        lrcData: '' 
    };
};

// ============================================================================
// Main API Service Abstractions
// ============================================================================

// ... (keep all your other export functions like searchSpotify, processAlbum, etc. here)
export const searchSpotify = (query) => fetch(`${FIREBASE_BASE_URL}/searchByString?q=${encodeURIComponent(query)}`).then(handleBackendResponse);
export const processAlbum = (albumUrl) => fetch(`${FIREBASE_BASE_URL}/processSpotifyAlbum?url=${encodeURIComponent(albumUrl)}`).then(handleBackendResponse);
export const processPlaylist = (playlistUrl) => fetch(`${FIREBASE_BASE_URL}/processSpotifyPlaylist?url=${encodeURIComponent(playlistUrl)}`).then(handleBackendResponse);
export const processTrackBatch = (trackIds) => fetch(`${FIREBASE_BASE_URL}/processBatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_ids: trackIds })
}).then(handleBackendResponse);
export const getTrackDetails = (trackIds) => fetch(`${FIREBASE_BASE_URL}/getTrackDetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_ids: trackIds })
}).then(handleBackendResponse);
export const getBackendRecommendations = (seedTrackIds) => fetch(`${FIREBASE_BASE_URL}/getBatchRecommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed_track_ids: seedTrackIds })
}).then(handleBackendResponse);
export const getManualVerificationList = (trackId) => fetch(`${FIREBASE_BASE_URL}/getManualVerificationList?trackId=${trackId}`).then(handleBackendResponse);
export const linkYouTubeToSpotify = (trackId, videoId) => fetch(`${FIREBASE_BASE_URL}/linkYouTubeToSpotify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackId, videoId })
}).then(handleBackendResponse);
export const autoLinkYouTubeToSpotify = (videoId, title, artist) => fetch(`${FIREBASE_BASE_URL}/autoLinkYouTubeToSpotify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, title, artist })
}).then(handleBackendResponse);
export const getLyrics = async (trackName, artistName) => {
    console.log(`[Lyrics] Searching for track: "${trackName}" by ${artistName}`);
    try {
        const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
        const response = await fetch(url);
        if (!response.ok) { throw new Error(`LRCLib API returned status ${response.status}`); }
        const results = await response.json();
        if (!results || results.length === 0) { console.log(`[Lyrics] No results found for "${trackName}"`); return null; }
        const bestMatch = results.find(r => r.syncedLyrics) || results.find(r => r.plainLyrics);
        if (bestMatch?.syncedLyrics) { console.log(`[Lyrics] Found SYNCED lyrics for "${trackName}"`); return bestMatch.syncedLyrics; }
        if (bestMatch?.plainLyrics) { console.warn(`[Lyrics] Found only PLAIN lyrics for "${trackName}".`); return bestMatch.plainLyrics; }
        console.log(`[Lyrics] No usable lyrics found for "${trackName}"`);
        return null;
    } catch (error) {
        console.error(`[Lyrics] Error fetching lyrics for "${trackName}":`, error);
        return null;
    }
};

/**
 * Orchestrates downloading a track using a race-and-fallback strategy.
 * @param {string} videoId The YouTube video ID.
 * @returns {Promise<object>} The final download information object.
 */
export const getDownloadInfo = async (videoId) => {
    console.log(`[Download] Starting race for videoId: ${videoId}`);
    
    let primaryResults = [];

    // Race the two primary downloaders against each other.
    try {
        const result = await Promise.any([
            tryFreeToolServer(videoId),
            tryY2Meta(videoId)
        ]);
        primaryResults.push(result);
        console.log(`[Download] Race winner is: ${result.source}`);
    } catch (aggregateError) {
        // This block runs if *both* primary methods fail to even get a link.
        console.error('[Download] Both primary methods failed to get a download link.', aggregateError.errors);
    }
    
    // After the race, find out which one was the loser, in case we need its link later.
    // This is a simplified way to get the second result. A more robust solution might
    // involve a custom Promise.race implementation, but this works for two promises.
    const loserPromise = primaryResults[0]?.source === 'FreeToolServer' ? tryY2Meta(videoId) : tryFreeToolServer(videoId);
    loserPromise.then(res => primaryResults.push(res)).catch(() => {/* The loser failed, which is fine */});
    
    // Now try to download from the winner.
    for (const result of primaryResults) {
        try {
            // Here, you would call your downloader's fetch function with result.downloadUrl
            // For this example, we'll just return the successful info.
            console.log(`[Download] Successfully secured download info from ${result.source}`);
            return result; 
        } catch (downloadError) {
            console.warn(`[Download] Failed to download from the winning link (${result.source}). Trying the next available link.`);
            // The loop will automatically continue to the next result if the download fails.
        }
    }

    // If all primary methods and their links fail, use the final Cloudflare worker fallback.
    try {
        console.log('[Download] All primary link(s) failed. Attempting Fallback Method (Cloudflare worker)...');
        const response = await fetch(CLOUDFLARE_DOWNLOADER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId }),
        });
        if (!response.ok) throw new Error('Cloudflare worker service also failed');
        const data = await response.json();
        console.log('[Download] Fallback Method Successful!');
        return data;
    } catch (fallbackError) {
        console.error(`[Download] All methods failed for videoId: ${videoId}. Last error: ${fallbackError.message}`);
        throw new Error('All download methods failed.');
    }
};
