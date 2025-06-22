/**
 * @file spotify.js
 * @description Manages all interactions with the Spotify API using the
 * app's own credentials (Client Credentials Flow).
 */
import { encode as btoa } from 'base-64';

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

let accessToken = null;
let tokenExpiry = 0;

/**
 * Gets a valid client-credentials access token, refreshing if necessary.
 * @private
 */
const getToken = async () => {
    if (accessToken && Date.now() < tokenExpiry - 60000) {
        return accessToken;
    }

    console.log('[Spotify] Fetching new application token...');
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error("Spotify Client ID or Secret is not configured in your .env file.");
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Spotify Auth Error: ${errorData.error_description || 'Invalid credentials'}`);
        }

        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiry = Date.now() + data.expires_in * 1000;
        return accessToken;
    } catch (error) {
        console.error("Failed to get Spotify token:", error.message);
        throw error;
    }
};

/**
 * The core function for making API calls.
 * @param {string} endpoint The API endpoint (e.g., '/browse/new-releases').
 */
export const callApi = async (endpoint) => {
    try {
        const token = await getToken();
        const response = await fetch(`${SPOTIFY_API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Spotify API Error: ${errorData.error?.message || response.statusText}`);
        }
        if (response.status === 204) return null;
        return response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * Searches Spotify for tracks, albums, and playlists.
 * @param {string} query The search term.
 */
export const search = (query) => {
    // URL-encode the query to handle special characters
    const params = new URLSearchParams({
        q: query,
        type: 'track', // Focusing on tracks for simplicity, can be expanded
        limit: 20
    });
    return callApi(`/search?${params.toString()}`);
};
