import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from '../colors';
import * as spotify from '../spotify';
import { TrackListItem } from './TrackListItem'; // Assuming this path is correct
import { usePlayer } from '../PlayerContext';

// Default image for when no album art is available
const DEFAULT_ALBUM_IMAGE = require('../assets/icon.png'); // Adjust path to your default logo/icon

export default function AlbumDetailsScreen({ route, navigation }) {
    // Get the album object passed via navigation parameters
    const { album } = route.params;
    const { playTrack } = usePlayer();

    const [albumTracks, setAlbumTracks] = useState([]);
    const [isLoadingTracks, setIsLoadingTracks] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!album || !album.id) {
            setError("Album data is missing or invalid.");
            setIsLoadingTracks(false);
            return;
        }

        const fetchAlbumTracks = async () => {
            setIsLoadingTracks(true);
            setError(null);
            try {
                // Fetch full track list for the album
                const tracks = await spotify.getAlbum(album.id);
                setAlbumTracks(tracks.filter(Boolean)); // Ensure no nulls
            } catch (e) {
                console.error("Failed to fetch album tracks:", e);
                setError("Failed to load album tracks. Please try again.");
            } finally {
                setIsLoadingTracks(false);
            }
        };

        fetchAlbumTracks();
    }, [album]); // Re-fetch if album object changes

    // Extract album image, preferring larger sizes
    const albumImage = album.images?.[0]?.url || DEFAULT_ALBUM_IMAGE;

    // Format release date if available
    const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : 'Unknown Year';

    return (
        <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Header with back button */}
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={30} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Album Header Section */}
                <View style={styles.albumHeader}>
                    <Image 
                        source={typeof albumImage === 'string' ? { uri: albumImage } : albumImage} 
                        style={styles.albumArtwork} 
                    />
                    <Text style={styles.albumTitle}>{album.name}</Text>
                    <Text style={styles.albumArtist}>
                        {album.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                    </Text>
                    <Text style={styles.albumMeta}>{releaseYear} • {albumTracks.length} Songs</Text>
                </View>

                {/* Tracks Section */}
                <View style={styles.tracksSection}>
                    <Text style={styles.sectionTitle}>Tracks</Text>
                    {isLoadingTracks ? (
                        <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ marginTop: 20 }} />
                    ) : error ? (
                        <Text style={styles.errorMessage}>{error}</Text>
                    ) : albumTracks.length > 0 ? (
                        <FlatList
                            data={albumTracks}
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
                        <Text style={styles.noContentText}>No tracks found for this album.</Text>
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
        paddingBottom: 20, // Add some padding at the bottom of the scroll view
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
    albumHeader: {
        alignItems: 'center',
        padding: 20,
        paddingTop: 0, // No extra padding at top as header has it
    },
    albumArtwork: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 20,
    },
    albumTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        textAlign: 'center',
        marginBottom: 5,
    },
    albumArtist: {
        fontSize: 18,
        color: AppTheme.colors.primary,
        textAlign: 'center',
        marginBottom: 5,
    },
    albumMeta: {
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
        // No specific styles needed here, TrackListItem handles its own padding
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
