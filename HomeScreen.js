import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';
import { usePlayer } from './PlayerContext';

const RecentTrackItem = ({ item, onPlay }) => (
    <TouchableOpacity style={styles.recentItemContainer} onPress={onPlay}>
        <Image source={{ uri: item.thumbnailUri || 'https://placehold.co/55x55/1F2F3A/FFFFFF?text=?' }} style={styles.recentImage} />
        <View style={styles.recentInfo}>
            <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.recentArtist} numberOfLines={1}>
                {Array.isArray(item.artists) ? item.artists.join(', ') : 'Unknown Artist'}
            </Text>
        </View>
        <Text style={styles.playCountText}>{item.playCount || 0} plays</Text>
    </TouchableOpacity>
);


export default function HomeScreen({ navigation }) {
    const { playTrack } = usePlayer();
    const [recents, setRecents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const tracksObj = await storage.getDownloadedTracks();
            const recentsResult = Object.values(tracksObj)
                    .filter(track => track.playCount > 0)
                    .sort((a, b) => (b.lastPlayedTimestamp || 0) - (a.lastPlayedTimestamp || 0))
                    .slice(0, 15);
            setRecents(recentsResult);
        } catch (error) {
            console.error("Failed to load home screen data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    ); 

    if (isLoading) {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ flex: 1 }}/>
            </SafeAreaView>
        );
    }
    
    if (recents.length === 0) { 
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
                {recents.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>Recently Played</Text>
                        {recents.map(item => (
                             <RecentTrackItem 
                                key={item.id} 
                                item={item} 
                                onPlay={() => playTrack(item, recents)} // Pass the full list to set the queue
                             />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    header: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
    sectionHeader: { fontSize: 22, fontWeight: 'bold', color: AppTheme.colors.text, marginBottom: 12 },
    sectionContainer: { marginBottom: 24, paddingLeft: 16 },
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
