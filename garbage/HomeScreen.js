import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';
import * as spotify from './spotify'; // Using the client-side spotify.js
import { usePlayer } from './PlayerContext'; // Import the player context

const chartPlaylistIds = {
    // "Global Top 50": "37i9dQZEVXbMDoHDwVN2tF",
    // "Viral 50 - Global": "37i9dQZEVXbLiRSasKsNU9",
    // "Top 50 - India": "7j3F9vm6LqRb5NyXPcf6vv",
};

// Reusable component for a single track in a horizontal chart
const ChartTrackCard = ({ item, onPress }) => (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
        <Image source={{ uri: item.album.images[0]?.url }} style={styles.cardImage} />
        <Text style={styles.cardText} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtext} numberOfLines={1}>
            {item.artists.map(a => a.name).join(', ')}
        </Text>
    </TouchableOpacity>
);

// Reusable component for a recently played track
const RecentTrackItem = ({ item, onPlay }) => (
    <TouchableOpacity style={styles.recentItemContainer} onPress={onPlay}>
        <Image source={{ uri: item.thumbnailUri }} style={styles.recentImage} />
        <View style={styles.recentInfo}>
            <Text style={styles.recentName} numberOfLines={1}>{item.spotifySongName}</Text>
            <Text style={styles.recentArtist} numberOfLines={1}>
                {item.spotifyArtists.join(', ')}
            </Text>
        </View>
        <Text style={styles.playCountText}>{item.playCount || 0} plays</Text>
    </TouchableOpacity>
);


export default function HomeScreen({ navigation }) {
    const { playTrack } = usePlayer();
    const [charts, setCharts] = useState([]);
    const [recents, setRecents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Correctly structured useFocusEffect
    useFocusEffect(
      useCallback(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch chart data and recent tracks in parallel
                const chartPromises = Object.entries(chartPlaylistIds).map(async ([title, id]) => {
                    const playlistItems = await spotify.getPlaylist(id);
                    return { title, data: playlistItems.slice(0, 10) }; // Get top 10 from each chart
                });
                
                const recentsPromise = storage.getDownloadedTracks().then(tracksObj => 
                    Object.values(tracksObj)
                        .filter(track => track.playCount > 0) // Only show played tracks
                        .sort((a, b) => (b.lastPlayedTimestamp || 0) - (a.lastPlayedTimestamp || 0)) // Sort by most recent play
                        .slice(0, 15) // Limit to 15
                );

                const [chartResults, recentResults] = await Promise.all([
                    Promise.all(chartPromises),
                    recentsPromise
                ]);

                setCharts(chartResults);
                setRecents(recentResults);

            } catch (error) {
                console.error("Failed to load home screen data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();

        // Optional: return a cleanup function if needed
        return () => {};
      }, [])
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ flex: 1 }}/>
            </SafeAreaView>
        );
    }

    if (charts.length === 0 && recents.length === 0) {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="musical-notes-outline" size={80} color={AppTheme.colors.primary} />
                    <Text style={styles.emptyTitle}>Feels so empty</Text>
                    <Text style={styles.emptySubtitle}>Explore new music to get started.</Text>
                    <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('Search')}>
                        <Text style={styles.exploreButtonText}>Explore Songs</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
                <Text style={styles.header}>Home</Text>

                {/* Recently Played Section */}
                {recents.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>Recently Played</Text>
                        {recents.map(item => (
                             <RecentTrackItem key={item.id} item={item} onPlay={() => playTrack(item)} />
                        ))}
                    </View>
                )}

                {/* Charts Section */}
                {charts.map(({ title, data }) => (
                    data.length > 0 && (
                        <View key={title} style={styles.sectionContainer}>
                            <Text style={styles.sectionHeader}>{title}</Text>
                            <FlatList
                                data={data}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => <ChartTrackCard item={item} onPress={() => console.log('Tapped on:', item.name)} />}
                            />
                        </View>
                    )
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    header: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
    sectionHeader: { fontSize: 22, fontWeight: 'bold', color: AppTheme.colors.text, marginBottom: 12 },
    sectionContainer: { marginBottom: 24, paddingLeft: 16 },
    cardContainer: { width: 150, marginRight: 15 },
    cardImage: { width: 150, height: 150, borderRadius: 8 },
    cardText: { color: AppTheme.colors.text, fontWeight: '600', marginTop: 8, fontSize: 14 },
    cardSubtext: { color: '#A0A0A0', fontSize: 12, marginTop: 2 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    emptyTitle: { fontSize: 24, fontWeight: 'bold', color: AppTheme.colors.text, marginTop: 20 },
    emptySubtitle: { fontSize: 16, color: '#A0A0A0', marginTop: 8, textAlign: 'center' },
    exploreButton: { backgroundColor: AppTheme.colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30, marginTop: 30 },
    exploreButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    recentItemContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingRight: 16 },
    recentImage: { width: 55, height: 55, borderRadius: 4 },
    recentInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    recentName: { color: AppTheme.colors.text, fontSize: 16, fontWeight: 'bold' },
    recentArtist: { color: '#A0A0A0', fontSize: 14, marginTop: 2 },
    playCountText: { fontSize: 12, color: '#A0A0A0' },
});
