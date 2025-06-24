import { getTrackDetails, processTrackBatch, getDownloadInfo, getLyrics } from './api';
import * as storage from './storage';
import { Buffer } from 'buffer';

// Polyfill for Buffer if it's not available globally (common in React Native)
if (!global.Buffer) {
  global.Buffer = Buffer;
}

// --- Private Helper Functions ---

/**
 * A wrapper for the fetch API that includes a retry mechanism. It now validates the size
 * of the response body directly to support chunked transfers.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options.
 * @param {number} retries - The maximum number of retry attempts.
 * @param {number} delay - The delay in milliseconds between retries.
 * @returns {Promise<Response>} - The fetch response object.
 * @throws {Error} - Throws an error if all fetch attempts fail.
 */
const fetchWithRetry = async (url, options, retries = 4, delay =4000) => {
    // A reasonable minimum size in bytes for a valid audio file.
    const MINIMUM_FILE_SIZE = 10000; // 10 KB

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            
            if (response.ok) {
                // Since the server uses chunked transfer, we can't rely on the 'content-length' header.
                // We must consume the response body to check its size.
                // We clone the response so that the original body can still be used later.
                const responseClone = response.clone();
                const bodyArrayBuffer = await responseClone.arrayBuffer();

                if (bodyArrayBuffer.byteLength > MINIMUM_FILE_SIZE) {
                     return response; // Success! The file is valid.
                }
                
                // If the response is OK but the content is too small, the server is likely still processing.
                console.warn(`[fetchWithRetry] Attempt ${i + 1}/${retries} for ${url} was OK but content size (${bodyArrayBuffer.byteLength} bytes) is too small. Retrying...`);
            } else {
                // Handle non-ok statuses (4xx, 5xx errors).
                console.warn(`[fetchWithRetry] Attempt ${i + 1}/${retries} failed for ${url} with status ${response.status}. Retrying...`);
            }
        } catch (error) {
            // This catches network errors or errors from .arrayBuffer() if the stream is malformed.
            console.warn(`[fetchWithRetry] Attempt ${i + 1}/${retries} for ${url} threw an error: ${error.message}. Retrying...`);
        }
        // Don't wait after the last attempt.
        if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // If all retries fail, throw a final error.
    throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
};


/**
 * Downloads all assets for a single track (audio, thumbnail, and now lyrics) and saves them to storage.
 * @param {object} trackDetails - The detailed track object from the backend, including the track ID.
 * @returns {Promise<{success: boolean, trackId: string}>} - An object indicating success and the track ID.
 */
const _downloadAndSave = async (trackDetails) => {
    const { id, youtubeVideoId, spotifySongName, spotifyArtists, thumbnailId } = trackDetails;

    if (!youtubeVideoId) {
        console.error(`[Downloader] No YouTube ID for track: ${id}.`);
        return { success: false, trackId: id };
    }

    try {
        // Step 1: Get the download URL for the audio
        const downloadResult = await getDownloadInfo(youtubeVideoId);
        if (!downloadResult?.downloadUrl) {
            console.error(`[Downloader] No download URL received for videoId: ${youtubeVideoId}`);
            return { success: false, trackId: id };
        }

        // Step 2: Fetch audio, thumbnail, and lyrics in parallel for efficiency
        console.log(`[Downloader] Fetching assets for "${spotifySongName}"...`);
        const artistNameString = spotifyArtists.join(',');

        const [audioResponse, thumbResponse, lrcData] = await Promise.all([
            fetchWithRetry(downloadResult.downloadUrl),
            thumbnailId ? fetchWithRetry(`https://i.scdn.co/image/${thumbnailId}`, {}, 2, 1000) : Promise.resolve(null),
            getLyrics(spotifySongName, artistNameString)
        ]).catch(err => {
            // This catch is for Promise.all. If audio fails, the whole thing should fail.
            console.error(`[Downloader] A critical asset fetch failed for "${spotifySongName}".`, err.message);
            throw err;
        });

        // Step 3: Process the fetched assets
        const audioBinary = await audioResponse.arrayBuffer();
        const songData = Buffer.from(audioBinary).toString('base64');
        
        let thumbnailData = null;
        if (thumbResponse && thumbResponse.ok) {
            const thumbnailBinary = await thumbResponse.arrayBuffer();
            thumbnailData = Buffer.from(thumbnailBinary).toString('base64');
        } else if (thumbnailId) {
            console.warn(`[Downloader] Thumbnail fetch failed for ${spotifySongName}. Proceeding without thumbnail.`);
        }
        
        // Step 4: Prepare metadata and save everything to storage
        const metadata = { id, name: spotifySongName, artists: spotifyArtists, duration_ms: downloadResult.durationMs || 0 };
        await storage.addDownloadedTrack(metadata, { songData, thumbnailData, lrcData: lrcData || '' });

        console.log(`[Downloader] Successfully processed: "${spotifySongName}"`);
        return { success: true, trackId: id };

    } catch (error) {
        // This top-level catch will trigger if a critical part like audio download fails.
        console.error(`[Downloader] _downloadAndSave failed for "${spotifySongName}"`, error.message);
        return { success: false, trackId: id };
    }
};

// --- Public Download Manager ---

let isProcessing = false;

const DownloadManager = {
    enqueueTrack: async (trackData) => {
      await storage.addTrackToDownloadQueue(trackData);
      console.log(`[Downloader] Enqueued "${trackData.name}". Queue processing must be started manually.`);
    },

    processQueue: async (onProgress) => {
        if (isProcessing) {
            console.log('[Downloader] Already processing. Aborting new run.');
            return;
        }

        isProcessing = true;
        console.log('[Downloader] Starting 3-way queue processing...');
        
        try {
            let queue = await storage.getDownloadQueue();
            if (queue.length === 0) {
                console.log('[Downloader] Queue is empty.');
                isProcessing = false;
                onProgress?.([]);
                return;
            }

            const batchToProcess = queue.slice(0, 30);
            let trackIdsToProcess = batchToProcess.map(t => t.id);

            queue.forEach(t => { if (trackIdsToProcess.includes(t.id)) t.status = 'processing'; });
            await storage.updateDownloadQueue(queue);
            onProgress?.(queue);
            
            console.log(`[Step 1/3] Checking for ${trackIdsToProcess.length} cached tracks...`);
            const initialDetails = await getTrackDetails(trackIdsToProcess);

            const tracksToDownloadImmediately = trackIdsToProcess
                .map(id => ({ ...initialDetails[id], id }))
                .filter(details => details.youtubeVideoId);
            
            let tracksNeedingProcessing = trackIdsToProcess
                .filter(id => !initialDetails[id]?.youtubeVideoId);

            if (tracksToDownloadImmediately.length > 0) {
                console.log(`[Step 1/3] Found ${tracksToDownloadImmediately.length} cached tracks. Downloading immediately.`);
                const downloadPromises = tracksToDownloadImmediately.map(details => _downloadAndSave(details));
                const results = await Promise.all(downloadPromises);

                let currentQueue = await storage.getDownloadQueue();
                results.forEach(({ success, trackId }) => {
                    if (success) {
                        currentQueue = currentQueue.filter(t => t.id !== trackId);
                    } else {
                        const trackInQueue = currentQueue.find(t => t.id === trackId);
                        if (trackInQueue) trackInQueue.status = 'failed';
                    }
                });
                await storage.updateDownloadQueue(currentQueue);
                onProgress?.(currentQueue);
            } else {
                console.log('[Step 1/3] No cached tracks found.');
            }

            if (tracksNeedingProcessing.length > 0) {
                console.log(`[Step 2/3] Sending ${tracksNeedingProcessing.length} new tracks for processing.`);
                await processTrackBatch(tracksNeedingProcessing);
                
                console.log('[Step 2/3] Waiting 20 seconds for backend processing...');
                await new Promise(resolve => setTimeout(resolve, 20000));

                console.log(`[Step 3/3] Fetching details for ${tracksNeedingProcessing.length} newly processed tracks.`);
                const finalDetails = await getTrackDetails(tracksNeedingProcessing);
                
                const tracksToDownloadNow = tracksNeedingProcessing
                    .map(id => ({ ...finalDetails[id], id }))
                    .filter(details => details.youtubeVideoId);

                if (tracksToDownloadNow.length > 0) {
                    console.log(`[Step 3/3] Downloading ${tracksToDownloadNow.length} newly processed tracks.`);
                    const downloadPromises = tracksToDownloadNow.map(details => _downloadAndSave(details));
                    const results = await Promise.all(downloadPromises);

                    let currentQueue = await storage.getDownloadQueue();
                    results.forEach(({ success, trackId }) => {
                        if (success) {
                            currentQueue = currentQueue.filter(t => t.id !== trackId);
                        } else {
                            const trackInQueue = currentQueue.find(t => t.id === trackId);
                            if (trackInQueue) trackInQueue.status = 'failed';
                        }
                    });
                    await storage.updateDownloadQueue(currentQueue);
                    onProgress?.(currentQueue);
                }
            } else {
                 console.log(`[Step 2/3] No tracks needed backend processing.`);
            }

        } catch (error) {
            console.error('[Downloader] A critical error occurred during queue processing:', error);
            let queue = await storage.getDownloadQueue();
            queue.forEach(t => { if (t.status === 'processing') t.status = 'failed' });
            await storage.updateDownloadQueue(queue);
            onProgress?.(queue);
        } finally {
            isProcessing = false;
            console.log('[Downloader] Processing finished.');
        }
    }
};

export default DownloadManager;
