import { getTrackDetails, processTrackBatch, getDownloadInfo } from './api';
import { addDownloadedTrack, initializeStorage } from './storage';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

// Polyfill Buffer if needed
if (!global.Buffer) global.Buffer = Buffer;

/**
 * Downloads and stores a track using the provided Spotify track ID.
 * @param {string} trackId - The Spotify track ID to download.
 * @param {function} [onComplete] - Optional callback when done.
 */
export const downloadAndStoreTrack = async (trackId, onComplete) => {
  console.log('[Downloader] Starting for trackId:', trackId);

  try {
    await initializeStorage();
    const detailsRes = await getTrackDetails([trackId]);
    const trackInfo = detailsRes[trackId];

    if (!trackInfo || trackInfo.status === 'unprocessed') {
      console.log('[Downloader] Track not processed. Enqueuing and retrying in 5s...');
      await processTrackBatch([trackId]);
      setTimeout(() => downloadAndStoreTrack(trackId, onComplete), 5000);
      return;
    }

    const { youtubeVideoId, spotifySongName, spotifyArtists, thumbnailId } = trackInfo;
    if (!youtubeVideoId) {
      console.error('[Downloader] No YouTube ID found for track:', trackId);
      onComplete?.(false);
      return;
    }

    console.log('[Download] Starting for videoId:', youtubeVideoId);
    const downloadResult = await getDownloadInfo(youtubeVideoId);
    if (!downloadResult?.downloadUrl) {
      console.error('[Download] No download URL returned');
      onComplete?.(false);
      return;
    }

    const audioBinary = await fetch(downloadResult.downloadUrl).then(res => res.arrayBuffer());
    const songData = Buffer.from(audioBinary).toString('base64');

    const thumbnailUrl = `https://i.scdn.co/image/${thumbnailId}`;
    const thumbnailBinary = await fetch(thumbnailUrl).then(res => res.arrayBuffer());
    const thumbnailBase64 = Buffer.from(thumbnailBinary).toString('base64');

    const metadata = {
      id: trackId,
      name: spotifySongName,
      artists: spotifyArtists,
      thumbnailUri: null,
      duration_ms: downloadResult.durationMs || 0,
    };

    await addDownloadedTrack(metadata, {
      songData,
      thumbnailData: thumbnailBase64,
      lrcData: downloadResult.lrcData || '',
    });

    console.log('[Downloader] Completed and saved', spotifySongName);
    onComplete?.(true);
  } catch (error) {
    console.error('[Downloader] Error downloading track', trackId, error);
    onComplete?.(false);
  }
};
