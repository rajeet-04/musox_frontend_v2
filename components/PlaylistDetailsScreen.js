import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from '../colors';
import * as spotify from '../spotify';
import { TrackListItem } from './TrackListItem'; // Assuming this path is correct
import { usePlayer } from '../PlayerContext';

// Default image for when no playlist art is available
const DEFAULT_PLAYLIST_IMAGE = require('../assets/icon.png'); // Adjust path to your default logo/icon

export default function PlaylistDetailsScreen({ route, navigation }) {
    // Get the playlist object passed via navigation parameters
    const { playlist } = route.params;
    const { playTrack } = usePlayer();

    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [isLoadingTracks, setIsLoadingTracks] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!playlist || !playlist.id) {
            setError("Playlist data is missing or invalid.");
            setIsLoadingTracks(false);
            return;
        }

        const fetchPlaylistTracks = async () => {
            setIsLoadingTracks(true);
            setError(null);
            try {
                // Fetch full track list for the playlist
                const tracks = await spotify.getPlaylist(playlist.id);
                setPlaylistTracks(tracks.filter(Boolean)); // Ensure no nulls
            } catch (e) {
                console.error("Failed to fetch playlist tracks:", e);
                setError("Failed to load playlist tracks. Please try again.");
            } finally {
                setIsLoadingTracks(false);
            }
        };

        fetchPlaylistTracks();
    }, [playlist]); // Re-fetch if playlist object changes

    // Extract playlist image, preferring larger sizes
    const playlistImage = playlist.images?.[0]?.url || DEFAULT_PLAYLIST_IMAGE;

    return (
        <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Header with back button */}
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={30} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Playlist Header Section */}
                <View style={styles.playlistHeader}>
                    <Image 
                        source={typeof playlistImage === 'string' ? { uri: playlistImage } : playlistImage} 
                        style={styles.playlistArtwork} 
                    />
                    <Text style={styles.playlistTitle}>{playlist.name}</Text>
                    {playlist.owner?.display_name && (
                        <Text style={styles.playlistOwner}>By {playlist.owner.display_name}</Text>
                    )}
                    {playlist.description && playlist.description !== '' && (
                        <Text style={styles.playlistDescription}>{playlist.description}</Text>
                    )}
                    <Text style={styles.playlistMeta}>{playlistTracks.length} Songs</Text>
                </View>

                {/* Tracks Section */}
                <View style={styles.tracksSection}>
                    <Text style={styles.sectionTitle}>Tracks</Text>
                    {isLoadingTracks ? (
                        <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ marginTop: 20 }} />
                    ) : error ? (
                        <Text style={styles.errorMessage}>{error}</Text>
                    ) : playlistTracks.length > 0 ? (
                        <FlatList
                            data={playlistTracks}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TrackListItem
                                    track={item}
                                    onPress={() => playTrack(item)} // Assuming playTrack can handle Spotify API track object
                                />
                            )}
                            scrollEnabled={false} // Nested FlatList should not scroll
                            contentContainerStyle={styles.tracksListContent}
                        />
                    ) : (
                        <Text style={styles.noContentText}>No tracks found in this playlist.</Text>
                    )}
                </View>
            </ScrollView>
            {/* Spacer for mini-player if it overlaps content */}
           
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: AppTheme.colors.background,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    headerContainer: {
        width: '100%',
        paddingHorizontal: 10,
        paddingVertical: 10,
        alignItems: 'flex-start',
    },
    backButton: {
        padding: 5,
    },
    playlistHeader: {
        alignItems: 'center',
        padding: 20,
        paddingTop: 0,
    },
    playlistArtwork: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 20,
    },
    playlistTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        textAlign: 'center',
        marginBottom: 5,
    },
    playlistOwner: {
        fontSize: 18,
        color: AppTheme.colors.primary,
        textAlign: 'center',
        marginBottom: 5,
    },
    playlistDescription: {
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    playlistMeta: {
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
    },
    tracksSection: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        marginBottom: 15,
    },
    tracksListContent: {
        // No specific styles needed here
    },
    errorMessage: {
        color: AppTheme.colors.notification,
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    noContentText: {
        color: '#A0A0A0',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
});
