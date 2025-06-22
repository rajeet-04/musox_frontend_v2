import React, { useState, useCallback, useLayoutEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';
import { useDownload } from './DownloadContext';
import { TrackListItem } from '../components/TrackListItem';

export default function DownloadsScreen({ navigation }) {
    const { downloadQueue } = useDownload();
    const [downloadedTracks, setDownloadedTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State for multi-select
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedTracks, setSelectedTracks] = useState(new Set());

    // Correctly structured useFocusEffect
    useFocusEffect(
        useCallback(() => {
            const loadDownloadedTracks = async () => {
                setIsLoading(true);
                try {
                    const tracksObject = await storage.getDownloadedTracks();
                    setDownloadedTracks(Object.values(tracksObject));
                } catch (e) {
                    console.error("Failed to load downloaded tracks:", e);
                } finally {
                    setIsLoading(false);
                }
            };

            loadDownloadedTracks();
            
            // Cleanup selection mode when screen loses focus
            return () => {
                setIsSelectionMode(false);
                setSelectedTracks(new Set());
            };
        }, [])
    );

    const toggleSelection = useCallback((trackId) => {
        const newSelection = new Set(selectedTracks);
        if (newSelection.has(trackId)) {
            newSelection.delete(trackId);
        } else {
            newSelection.add(trackId);
        }
        setSelectedTracks(newSelection);
    }, [selectedTracks]);
    
    const handleLongPress = (trackId) => {
        setIsSelectionMode(true);
        toggleSelection(trackId);
    };
    
    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedTracks(new Set());
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            "Delete Tracks",
            `Are you sure you want to delete ${selectedTracks.size} track(s)? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        console.log("Deleting tracks:", Array.from(selectedTracks));
                        // Here you would add the logic to call storage.removeTracks(Array.from(selectedTracks))
                        // and then refresh the list from storage.
                        handleCancelSelection();
                        // For now, just a placeholder:
                        Alert.alert("Deleted", `${selectedTracks.size} tracks have been removed.`);
                    }
                }
            ]
        );
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                isSelectionMode ? (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerButton}>
                            <Ionicons name="trash-outline" size={24} color={AppTheme.colors.notification} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancelSelection} style={styles.headerButton}>
                             <Ionicons name="close-circle-outline" size={26} color={AppTheme.colors.text} />
                        </TouchableOpacity>
                    </View>
                ) : null
            ),
            headerTitle: isSelectionMode ? `${selectedTracks.size} selected` : 'Downloads',
        });
    }, [navigation, isSelectionMode, selectedTracks]);

    const sections = [];
    if(downloadQueue.length > 0) {
        sections.push({ title: 'Currently Downloading', data: downloadQueue });
    }
    if(downloadedTracks.length > 0) {
        sections.push({ title: 'Completed', data: downloadedTracks });
    }

    if (isLoading) {
        return <SafeAreaView style={styles.screenContainer}><ActivityIndicator size="large" color={AppTheme.colors.primary} /></SafeAreaView>;
    }
    
    return (
        <SafeAreaView style={styles.screenContainer}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={({ item, section }) => {
                    if (section.title === 'Currently Downloading') {
                        return (
                            <View style={styles.queueItem}>
                                <Text style={styles.queueText}>{item.name}</Text>
                                <ActivityIndicator color={AppTheme.colors.primary}/>
                            </View>
                        );
                    }
                    return (
                        <TrackListItem
                            track={item}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedTracks.has(item.id)}
                            onLongPress={() => handleLongPress(item.id)}
                            onPress={() => {
                                if (isSelectionMode) {
                                    toggleSelection(item.id);
                                } else {
                                    // Handle regular press (e.g., play track)
                                }
                            }}
                        />
                    );
                }}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cloud-download-outline" size={80} color={AppTheme.colors.primary} />
                        <Text style={styles.emptyTitle}>No Downloads</Text>
                        <Text style={styles.emptySubtitle}>Songs you download will appear here.</Text>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
                style={{width: '100%'}}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerButton: { paddingHorizontal: 12 },
    sectionHeader: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: AppTheme.colors.text, 
        backgroundColor: AppTheme.colors.background,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    queueItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: AppTheme.colors.card, marginHorizontal: 16, borderRadius: 8, marginBottom: 8 },
    queueText: { color: AppTheme.colors.text, fontSize: 16 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '40%' },
    emptyTitle: { fontSize: 24, fontWeight: 'bold', color: AppTheme.colors.text, marginTop: 20 },
    emptySubtitle: { fontSize: 16, color: '#A0A0A0', marginTop: 8 },
});
