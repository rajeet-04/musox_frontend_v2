import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';
import * as spotify from './spotify'; // Using the client-side spotify.js
import { usePlayer } from './PlayerContext'; // Import the player context

// Reusable component for a single track in a horizontal chart
const ChartTrackCard = ({ item, onPress }) => {
    // Safely access album images, providing a fallback placeholder
    const imageUrl = item.images?.[0]?.url || item.album?.images?.[0]?.url || 'https://placehold.co/150x150/1F2F3A/FFFFFF?text=No+Image';
    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
            <Image source={{ uri: imageUrl }} style={styles.cardImage} />
            <Text style={styles.cardText} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardSubtext} numberOfLines={1}>
                {item.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
            </Text>
        </TouchableOpacity>
    );
};

// Reusable component for a recently played track
const RecentTrackItem = ({ item, onPlay }) => (
    <TouchableOpacity style={styles.recentItemContainer} onPress={onPlay}>
        {/* Fallback for thumbnailUri, ensure it exists or use a placeholder */}
        <Image source={{ uri: item.thumbnailUri || 'https://placehold.co/55x55/1F2F3A/FFFFFF?text=?' }} style={styles.recentImage} />
        <View style={styles.recentInfo}>
            <Text style={styles.recentName} numberOfLines={1}>{item.spotifySongName || item.name}</Text>
            <Text style={styles.recentArtist} numberOfLines={1}>
                {Array.isArray(item.spotifyArtists) ? item.spotifyArtists.join(', ') : (item.artists?.map(a => a.name).join(', ') || 'Unknown Artist')}
            </Text>
        </View>
        <Text style={styles.playCountText}>{item.playCount || 0} plays</Text>
    </TouchableOpacity>
);


export default function HomeScreen({ navigation }) {
    const { playTrack } = usePlayer();
    // No longer fetching dynamic charts from user-specific endpoints
    const [recents, setRecents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // useCallback is used to memoize the loadData function,
    // preventing it from being re-created on every render
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch recently played tracks from local storage
            const recentsResult = await storage.getDownloadedTracks().then(tracksObj => 
                Object.values(tracksObj)
                    .filter(track => track.playCount > 0) // Only show played tracks
                    .sort((a, b) => (b.lastPlayedTimestamp || 0) - (a.lastPlayedTimestamp || 0)) // Sort by most recent play
                    .slice(0, 15) // Limit to 15 recent tracks
            );

            setRecents(recentsResult);
            // Since user-specific charts are removed, set charts to an empty array
            // If you later add public charts (e.g., Global Top 50), add them here
            // setCharts([]); 

        } catch (error) {
            console.error("Failed to load home screen data:", error);
            // Error handling for the overall loadData
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means this callback is created only once

    // useFocusEffect ensures data is reloaded whenever the screen comes into focus
    // The async function is now correctly defined and called inside the useCallback.
    useFocusEffect(
        useCallback(() => {
            loadData(); // Call the memoized async function
            // Optional: return a cleanup function if needed
            return () => {
                // Any cleanup logic when the screen loses focus
            };
        }, [loadData]) // Dependency array for this useCallback. `loadData` itself is memoized.
    ); 

    if (isLoading) {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ flex: 1 }}/>
            </SafeAreaView>
        );
    }

    // Display empty state if no data is loaded
    if (recents.length === 0) { // Only check recents now
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

                {/* Dynamically Fetched Sections (Removed user-specific sections) */}
                {/* If you add other public charts or sections, they would go here */}
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
