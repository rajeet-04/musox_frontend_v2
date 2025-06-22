/**
 * @file spotify.js
 * @description Client-side service for all direct Spotify API interactions.
 * This uses frontend-specific credentials and handles its own token management.
 */

import 'react-native-url-polyfill/auto'; // Required for URLSearchParams
import { encode as btoa } from 'base-64';

// --- Configuration ---
// WARNING: Storing secrets on the client-side is insecure for a public app.
// Since this is for personal use, we can use environment variables.
// In your project root, create a file named .env and add:
// SPOTIFY_CLIENT_ID=your_client_id_here
// SPOTIFY_CLIENT_SECRET=your_client_secret_here
const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpirationTime = 0;

/**
 * Gets a valid client-credentials access token, refreshing if necessary.
 * @private
 */
const _getAccessToken = async () => {
    // Check if a token exists and is still valid
    if (accessToken && Date.now() < tokenExpirationTime) {
        return accessToken;
    }

    console.log('[Spotify.js] Token expired or not found, fetching new one...');
    const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
    // Encode credentials to Base64 for the Authorization header
    const encodedCredentials = btoa(credentials);

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${encodedCredentials}`,
            },
            body: 'grant_type=client_credentials', // Request client credentials grant type
        });

        const data = await response.json();
        // Check for response success and any error messages from Spotify
        if (!response.ok || data.error) {
            throw new Error(`Spotify Auth Error: ${data.error_description || 'Unknown authentication error'}`);
        }

        accessToken = data.access_token;
        // Set expiration time slightly before actual expiry for safety
        tokenExpirationTime = Date.now() + (data.expires_in - 300) * 1000;
        
        return accessToken;
    } catch (error) {
        console.error("[Spotify.js] Failed to get access token:", error);
        throw error; // Re-throw to propagate the error
    }
};

/**
 * A wrapper for making authenticated requests to the Spotify API.
 * Ensures an access token is available before making the call.
 * @private
 * @param {string} url The Spotify API endpoint URL.
 * @returns {Promise<object>} The JSON response from the Spotify API.
 */
const _makeApiCall = async (url) => {
    try {
        const token = await _getAccessToken(); // Get a valid access token
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`, // Use the obtained token for authorization
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Provide more specific error messages from Spotify if available
            throw new Error(`Spotify API Error: ${errorData.error?.message || response.statusText || response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`[Spotify.js] API call failed for ${url}:`, error);
        throw error; // Re-throw to propagate the error
    }
};

/**
 * A comprehensive search for tracks, albums, and playlists.
 * @param {string} query The search term.
 * @returns {Promise<{tracks: object, albums: object, playlists: object}>}
 */
export const search = async (query) => {
    const encodedQuery = encodeURIComponent(query);
    // Updated type to include 'artist' for comprehensive search results
    const type = "track,album,playlist,artist"; 
    const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=${type}&limit=10`; // Increased limit to ensure enough items for sections
    return _makeApiCall(url);
};

/**
 * Gets a single track's details.
 * @param {string} trackId The Spotify track ID.
 * @returns {Promise<object>} The track object.
 */
export const getTrack = async (trackId) => {
    const url = `https://api.spotify.com/v1/tracks/${trackId}`;
    return _makeApiCall(url);
};

/**
 * Gets all tracks from a specific album.
 * @param {string} albumId The Spotify album ID.
 * @returns {Promise<Array<object>>} An array of track objects.
 */
export const getAlbum = async (albumId) => {
    const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
    const response = await _makeApiCall(url);
    return response.items;
};

/**
 * Gets all tracks from a specific playlist.
 * Iterates through paginated results to get all tracks.
 * @param {string} playlistId The Spotify playlist ID.
 * @returns {Promise<Array<object>>} An array of track objects from the playlist.
 */
export const getPlaylist = async (playlistId) => {
    const allTracks = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
    
    do {
        const response = await _makeApiCall(url);
        response.items.forEach(item => {
            if (item.track) allTracks.push(item.track);
        });
        url = response.next; // URL for the next page of results
    } while (url); // Continue until no more pages

    return allTracks;
};

/**
 * Gets an artist's top 5 tracks and their albums.
 * @param {string} artistId The Spotify artist ID.
 * @returns {Promise<{topTracks: Array<object>, albums: Array<object>}>}
 */
export const getArtist = async (artistId) => {
    const topTracksPromise = _makeApiCall(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`);
    const albumsPromise = _makeApiCall(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`);

    const [topTracksResponse, albumsResponse] = await Promise.all([topTracksPromise, albumsPromise]);

    return {
        topTracks: topTracksResponse.tracks.slice(0, 5), // Limit to top 5 tracks
        albums: albumsResponse.items
    };
};
