import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from '../colors';
import * as spotify from '../spotify';
import { TrackListItem } from './TrackListItem';
import { usePlayer } from '../PlayerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_ARTIST_IMAGE = require('../assets/icon.png');

const AlbumCard = ({ item, onPress }) => {
    const imageUrl = item.images?.[0]?.url;
    const imageSource = imageUrl ? { uri: imageUrl } : DEFAULT_ARTIST_IMAGE;
    const title = item.name;
    const subtext = item.release_date ? new Date(item.release_date).getFullYear().toString() : '';

    return (
        <TouchableOpacity style={styles.albumCardContainer} onPress={onPress}>
            <Image source={imageSource} style={styles.albumCardImage} />
            <Text style={styles.albumCardText} numberOfLines={1}>{title}</Text>
            <Text style={styles.albumCardSubtext} numberOfLines={1}>{subtext}</Text>
        </TouchableOpacity>
    );
};

export default function ArtistDetailsScreen({ route, navigation }) {
    const { artist: initialArtistData } = route.params;
    const { playTrack } = usePlayer();

    // This state will hold the complete artist data, whether it's passed directly or fetched.
    const [artistData, setArtistData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadArtistData = async () => {
            if (!initialArtistData || !initialArtistData.id) {
                setError("Artist data is missing or invalid.");
                setIsLoading(false);
                return;
            }

            // If the passed data already has top tracks, it's complete. Use it directly.
            if (initialArtistData.topTracks) {
                setArtistData(initialArtistData);
                setIsLoading(false);
            } else {
                // Otherwise, fetch the complete data using the artist ID.
                try {
                    const completeData = await spotify.getArtist(initialArtistData.id);
                    setArtistData(completeData);
                } catch (e) {
                    console.error("Failed to fetch full artist details:", e);
                    setError("Could not load artist details.");
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadArtistData();
    }, [initialArtistData]);

    if (isLoading) {
        return <SafeAreaView style={styles.screenContainer}><ActivityIndicator size="large" color={AppTheme.colors.primary} /></SafeAreaView>;
    }
    
    if (error || !artistData) {
        return (
             <SafeAreaView style={styles.screenContainer}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={30} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.errorMessage}>{error || "Artist not found."}</Text>
            </SafeAreaView>
        );
    }
    
    const artistImage = artistData.images?.[0]?.url;
    const imageSource = artistImage ? { uri: artistImage } : DEFAULT_ARTIST_IMAGE;

    return (
        <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={30} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.artistHeader}>
                    <Image source={imageSource} style={styles.artistArtwork} />
                    <Text style={styles.artistName}>{artistData.name}</Text>
                    {artistData.followers?.total && (
                        <Text style={styles.artistMeta}>{artistData.followers.total.toLocaleString()} Followers</Text>
                    )}
                </View>

                {artistData.topTracks?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Top Tracks</Text>
                        <FlatList
                            data={artistData.topTracks}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TrackListItem
                                    track={item}
                                    onPress={() => playTrack(item, artistData.topTracks)}
                                />
                            )}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                {artistData.albums?.length > 0 && (
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
                            contentContainerStyle={{ paddingLeft: 16 }}
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: AppTheme.colors.background,
        justifyContent: 'center'
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
        borderRadius: 999,
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
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        marginBottom: 15,
        paddingHorizontal: 16,
    },
    albumCardContainer: {
        width: SCREEN_WIDTH * 0.38,
        marginRight: 16,
    },
    albumCardImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        marginBottom: 8,
    },
    albumCardText: {
        color: AppTheme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    albumCardSubtext: {
        color: '#A0A0A0',
        fontSize: 12,
        marginTop: 2,
    },
    errorMessage: {
        color: AppTheme.colors.notification,
        textAlign: 'center',
        fontSize: 16,
    },
});
