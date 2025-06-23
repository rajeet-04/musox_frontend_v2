import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, FlatList, ActivityIndicator, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';
import { TrackListItem } from './components/TrackListItem';
import { usePlayer } from './PlayerContext';

const DEFAULT_IMAGE = 'https://placehold.co/200/1F2F3A/121212?text=?';

const AddSongsModal = ({ isVisible, onClose, onAdd, existingTrackIds }) => {
    const [allTracks, setAllTracks] = useState([]);
    const [selectedToAdd, setSelectedToAdd] = useState(new Set());

    useEffect(() => {
        if (isVisible) {
            const fetchAllTracks = async () => {
                const tracksObj = await storage.getDownloadedTracks();
                const availableTracks = Object.values(tracksObj).filter(t => !existingTrackIds.has(t.id));
                setAllTracks(availableTracks);
                setSelectedToAdd(new Set());
            };
            fetchAllTracks();
        }
    }, [isVisible, existingTrackIds]);

    const toggleSelection = (trackId) => {
        setSelectedToAdd(prev => {
            const updated = new Set(prev);
            if (updated.has(trackId)) {
                updated.delete(trackId);
            } else {
                updated.add(trackId);
            }
            return updated;
        });
    };

    const handleAddSongs = () => {
        onAdd(Array.from(selectedToAdd));
        onClose();
    };

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Songs</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={28} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={allTracks}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                         <TrackListItem
                            track={item}
                            onPress={() => toggleSelection(item.id)}
                            isSelectionMode={true}
                            isSelected={selectedToAdd.has(item.id)}
                        />
                    )}
                    ListEmptyComponent={<Text style={styles.noContentText}>No more songs to add.</Text>}
                />
                <TouchableOpacity style={[styles.addButton, selectedToAdd.size === 0 && styles.disabledButton]} onPress={handleAddSongs} disabled={selectedToAdd.size === 0}>
                    <Text style={styles.addButtonText}>Add {selectedToAdd.size} Songs</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
};

export default function UserPlaylistScreen({ route, navigation }) {
    const { playlist: initialPlaylist } = route.params;
    const { playTrack } = usePlayer();

    const [playlist, setPlaylist] = useState(initialPlaylist);
    const [tracks, setTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedTracks, setSelectedTracks] = useState(new Set());
    const [isAddModalVisible, setAddModalVisible] = useState(false);

    const isAllSongsPlaylist = playlist.id === 'all-songs';
    const isMounted = useRef(false);

    const loadPlaylistTracks = useCallback(async () => {
        setIsLoading(true);
        try {
            const allTracksFromStorage = await storage.getDownloadedTracks();
            let finalTracks;

            if (isAllSongsPlaylist) {
                finalTracks = Object.values(allTracksFromStorage);
            } else {
                const currentPlaylists = await storage.getPlaylists();
                const updatedPlaylist = currentPlaylists.find(p => p.id === playlist.id) || playlist;
                setPlaylist(updatedPlaylist);
                finalTracks = updatedPlaylist.trackIds.map(id => allTracksFromStorage[id]).filter(Boolean);
            }
            setTracks(finalTracks);
        } catch (e) {
            console.error("Failed to load playlist tracks:", e);
        } finally {
            setIsLoading(false);
        }
    }, [playlist.id, isAllSongsPlaylist]);

    useFocusEffect(
        useCallback(() => {
            if (!isMounted.current) {
                isMounted.current = true;
                loadPlaylistTracks();
            }
            return () => {};
        }, [loadPlaylistTracks])
    );

    const handleLongPress = (trackId) => {
        if (isAllSongsPlaylist) return;
        setIsSelectionMode(true);
        toggleSelection(trackId);
    };

    const toggleSelection = (trackId) => {
        setSelectedTracks(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(trackId)) {
                newSelection.delete(trackId);
            } else {
                newSelection.add(trackId);
            }
            return newSelection;
        });
    };

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedTracks(new Set());
    };

    const handleDeleteSelected = () => {
        Alert.alert("Delete Songs", `Remove ${selectedTracks.size} song(s) from this playlist?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove", style: "destructive",
                onPress: async () => {
                    await storage.removeTracksFromPlaylist(playlist.id, Array.from(selectedTracks));
                    cancelSelection();
                    setTracks(current => current.filter(t => !selectedTracks.has(t.id)));
                },
            },
        ]);
    };

    const handleAddSongs = async (trackIdsToAdd) => {
        await storage.addTracksToPlaylist(playlist.id, trackIdsToAdd);
        loadPlaylistTracks();
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => {
                if (isAllSongsPlaylist) return null;
                if (isSelectionMode) {
                    return (
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={handleDeleteSelected} style={{marginRight: 15}}>
                                <Ionicons name="trash-outline" size={24} color={AppTheme.colors.notification} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cancelSelection}>
                                <Ionicons name="close-circle-outline" size={26} color={AppTheme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    );
                }
                return (
                    <TouchableOpacity onPress={() => setAddModalVisible(true)}>
                        <Ionicons name="add" size={28} color={AppTheme.colors.primary} />
                    </TouchableOpacity>
                );
            },
            headerTitle: isSelectionMode ? `${selectedTracks.size} selected` : playlist.name,
            headerShown: true,
            headerTransparent: true,
            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
                    <Ionicons name="chevron-back" size={30} color={AppTheme.colors.text} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, isSelectionMode, selectedTracks, playlist.name, isAllSongsPlaylist]);

    const getArtworkGrid = () => {
        const artwork = tracks.map(t => t.thumbnailUri).filter(Boolean).slice(0, 4);
        while (artwork.length < 4) artwork.push(DEFAULT_IMAGE);
        return artwork;
    };

    return (
        <SafeAreaView style={styles.screenContainer}>
            <AddSongsModal
                isVisible={isAddModalVisible}
                onClose={() => setAddModalVisible(false)}
                onAdd={handleAddSongs}
                existingTrackIds={new Set(tracks.map(t => t.id))}
            />

            <FlatList
                data={tracks}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={() => (
                    <View style={styles.playlistHeader}>
                        <View style={styles.playlistArtworkGrid}>
                            {getArtworkGrid().map((uri, index) => (
                                <Image key={index} source={{ uri }} style={styles.playlistArtwork} />
                            ))}
                        </View>
                        <Text style={styles.playlistTitle}>{playlist.name}</Text>
                        <Text style={styles.playlistMeta}>{tracks.length} Songs</Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <TrackListItem
                        track={item}
                        onPress={() => {
                            if (isSelectionMode) toggleSelection(item.id);
                            else playTrack(item, tracks);
                        }}
                        onLongPress={() => handleLongPress(item.id)}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedTracks.has(item.id)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {!isLoading && <Text style={styles.noContentText}>This playlist is empty. Tap '+' to add songs.</Text>}
                    </View>
                }
                ListFooterComponent={<View style={{ height: 150 }} />}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                ListHeaderComponentStyle={{ marginBottom: 20 }}
            />
            {isLoading && <ActivityIndicator size="large" color={AppTheme.colors.primary} style={StyleSheet.absoluteFill} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    headerActions: { flexDirection: 'row' },
    noContentText: { color: '#A0A0A0', textAlign: 'center', fontSize: 16 },
    emptyContainer: { paddingTop: 40, alignItems: 'center' },
    playlistHeader: { alignItems: 'center', paddingTop: 80 },
    playlistArtworkGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 200, height: 200, backgroundColor: AppTheme.colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
    playlistArtwork: { width: '50%', height: '50%' },
    playlistTitle: { fontSize: 28, fontWeight: 'bold', color: AppTheme.colors.text, textAlign: 'center', marginBottom: 5 },
    playlistMeta: { fontSize: 14, color: '#A0A0A0', textAlign: 'center' },
    modalContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: AppTheme.colors.text },
    addButton: { backgroundColor: AppTheme.colors.primary, margin: 20, padding: 15, borderRadius: 8, alignItems: 'center' },
    disabledButton: { backgroundColor: AppTheme.colors.border },
    addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
