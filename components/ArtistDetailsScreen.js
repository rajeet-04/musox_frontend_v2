import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from '../colors';
import * as spotify from '../spotify';
import { TrackListItem } from './TrackListItem';
import { usePlayer } from '../PlayerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Default image for when no artist image is available
const DEFAULT_ARTIST_IMAGE = require('../assets/icon.png'); // Adjust path to your default logo/icon

// Reusable component for displaying Album cards in horizontal lists
const AlbumCard = ({ item, onPress }) => {
    const imageUrl = item.images?.[0]?.url;
    const imageSource = imageUrl ? { uri: imageUrl } : DEFAULT_ARTIST_IMAGE; // Using artist default for album fallback for now
    const title = item.name;
    const subtext = item.release_date ? new Date(item.release_date).getFullYear().toString() : ''; // Show release year

    return (
        <TouchableOpacity style={styles.albumCardContainer} onPress={onPress}>
            <Image source={imageSource} style={styles.albumCardImage} />
            <Text style={styles.albumCardText} numberOfLines={1}>{title}</Text>
            <Text style={styles.albumCardSubtext} numberOfLines={1}>{subtext}</Text>
        </TouchableOpacity>
    );
};


export default function ArtistDetailsScreen({ route, navigation }) {
    // Get the artist object passed via navigation parameters
    const { artist } = route.params;
    const { playTrack } = usePlayer();

    const [artistData, setArtistData] = useState(null); // Will store topTracks and albums
    const [isLoadingArtist, setIsLoadingArtist] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!artist || !artist.id) {
            setError("Artist data is missing or invalid.");
            setIsLoadingArtist(false);
            return;
        }

        const fetchArtistDetails = async () => {
            setIsLoadingArtist(true);
            setError(null);
            try {
                // Fetch top tracks and albums for the artist
                const data = await spotify.getArtist(artist.id);
                // Filter out any null/undefined tracks or albums
                setArtistData({
                    topTracks: data.topTracks?.filter(Boolean) || [],
                    albums: data.albums?.filter(Boolean) || []
                });
            } catch (e) {
                console.error("Failed to fetch artist details:", e);
                setError("Failed to load artist details. Please try again.");
            } finally {
                setIsLoadingArtist(false);
            }
        };

        fetchArtistDetails();
    }, [artist]); // Re-fetch if artist object changes

    // Extract artist image, preferring larger sizes
    const artistImage = artist.images?.[0]?.url;
    const imageSource = artistImage ? { uri: artistImage } : DEFAULT_ARTIST_IMAGE;


    return (
        <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Header with back button */}
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={30} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Artist Header Section */}
                <View style={styles.artistHeader}>
                    <Image 
                        source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource} 
                        style={styles.artistArtwork} 
                    />
                    <Text style={styles.artistName}>{artist.name}</Text>
                    {artist.followers?.total && (
                        <Text style={styles.artistMeta}>{artist.followers.total.toLocaleString()} Followers</Text>
                    )}
                </View>

                {/* Loading/Error State */}
                {isLoadingArtist ? (
                    <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ marginTop: 20 }} />
                ) : error ? (
                    <Text style={styles.errorMessage}>{error}</Text>
                ) : (
                    <>
                        {/* Top Tracks Section */}
                        {artistData?.topTracks?.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Top Tracks</Text>
                                <FlatList
                                    data={artistData.topTracks}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TrackListItem
                                            track={item}
                                            onPress={() => playTrack(item)}
                                        />
                                    )}
                                    scrollEnabled={false}
                                    contentContainerStyle={styles.tracksListContent}
                                />
                            </View>
                        )}

                        {/* Albums Section */}
                        {artistData?.albums?.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Albums</Text>
                                <FlatList
                                    data={artistData.albums}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <AlbumCard 
                                            item={item} 
                                            onPress={() => navigation.navigate('AlbumDetails', { album: item })} 
                                        />
                                    )}
                                    contentContainerStyle={styles.albumsListContent}
                                />
                            </View>
                        )}

                        {/* No Content Message */}
                        {artistData?.topTracks?.length === 0 && artistData?.albums?.length === 0 && (
                            <Text style={styles.noContentText}>No tracks or albums found for this artist.</Text>
                        )}
                    </>
                )}
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
    artistHeader: {
        alignItems: 'center',
        padding: 20,
        paddingTop: 0,
    },
    artistArtwork: {
        width: 180,
        height: 180,
        borderRadius: 999, // Circular image for artists
        marginBottom: 20,
    },
    artistName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        textAlign: 'center',
        marginBottom: 5,
    },
    artistMeta: {
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
    },
    section: {
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
    albumsListContent: {
        paddingHorizontal: 0, // Padding handled by AlbumCard margin
    },
    albumCardContainer: {
        width: SCREEN_WIDTH * 0.38, // Roughly 2.5 cards per screen width
        marginRight: 15,
        alignItems: 'flex-start',
    },
    albumCardImage: {
        width: '100%',
        aspectRatio: 1, // Square image
        borderRadius: 8,
        marginBottom: 8,
    },
    albumCardText: {
        color: AppTheme.colors.text,
        fontWeight: '600',
        fontSize: 14,
        width: '100%',
    },
    albumCardSubtext: {
        color: '#A0A0A0',
        fontSize: 12,
        marginTop: 2,
        width: '100%',
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
