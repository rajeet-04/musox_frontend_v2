import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';

const PlaylistItem = ({ playlist, allTracks, onPress }) => {
  const trackIds = playlist.trackIds || [];
  const artwork = trackIds
    .map(id => allTracks[id]?.thumbnailUri)
    .filter(Boolean)
    .slice(0, 4);

  while (artwork.length < 4) {
    artwork.push('https://placehold.co/100/1F2F3A/121212?text=?');
  }

  return (
    <TouchableOpacity style={styles.playlistItem} onPress={onPress}>
      <View style={styles.playlistArtworkGrid}>
        {artwork.map((uri, index) => (
          <Image key={index} source={{ uri }} style={styles.playlistArtwork} />
        ))}
      </View>
      <Text style={styles.playlistName}>{playlist.name}</Text>
      <Text style={styles.playlistSubtext}>{trackIds.length} songs</Text>
    </TouchableOpacity>
  );
};

export default function LibraryScreen({ navigation }) {
  const [allTracks, setAllTracks] = useState({});
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('recently_added');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useFocusEffect(
    useCallback(() => {
      const loadLibraryData = async () => {
        setIsLoading(true);
        try {
          const tracksData = await storage.getDownloadedTracks();
          const playlistsData = await storage.getPlaylists();
          setAllTracks(tracksData);
          setPlaylists(playlistsData);
        } catch (e) {
          console.error("Failed to load library data:", e);
        } finally {
          setIsLoading(false);
        }
      };
      loadLibraryData();
    }, [])
  );

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      if (sortOrder === 'alphabetical') return a.name.localeCompare(b.name);
      return (new Date(b.createdAt) || 0) - (new Date(a.createdAt) || 0);
    });
  }, [playlists, sortOrder]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Invalid Name", "Please enter a name for your playlist.");
      return;
    }
    try {
      const newPlaylist = await storage.createPlaylist(newPlaylistName);
      setNewPlaylistName('');
      setIsModalVisible(false);
      if (newPlaylist) {
        setPlaylists(prev => [...prev, newPlaylist]);
      }
    } catch (e) {
      console.error("Failed to create playlist:", e);
      Alert.alert("Error", "Could not create the playlist.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <ActivityIndicator size="large" color={AppTheme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      <Text style={styles.header}>Library</Text>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() =>
            setSortOrder(sortOrder === 'alphabetical' ? 'recently_added' : 'alphabetical')
          }
        >
          <Ionicons
            name={sortOrder === 'alphabetical' ? 'swap-vertical' : 'time-outline'}
            size={20}
            color={AppTheme.colors.text}
          />
          <Text style={styles.sortText}>{sortOrder === 'alphabetical' ? 'Alphabetical' : 'Recent'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add" size={24} color={AppTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedPlaylists}
        numColumns={2}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <PlaylistItem
            playlist={{ name: 'All Songs', id: 'all-songs', trackIds: Object.keys(allTracks) }}
            allTracks={allTracks}
            onPress={() =>
              navigation.navigate('UserPlaylist', {
                playlist: { name: 'All Songs', id: 'all-songs' },
              })
            }
          />
        }
        renderItem={({ item }) => (
          <PlaylistItem
            playlist={item}
            allTracks={allTracks}
            onPress={() => navigation.navigate('UserPlaylist', { playlist: item })}
          />
        )}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={80} color={AppTheme.colors.primary} />
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptySubtitle}>Create a playlist to get started.</Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist Name"
              placeholderTextColor="#888"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreatePlaylist}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
  header: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: AppTheme.colors.text, marginLeft: 8, fontSize: 16 },
  addButton: { padding: 8 },
  list: { flex: 1 },
  playlistItem: { flex: 1, margin: 8, maxWidth: '46%' },
  playlistArtworkGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', aspectRatio: 1, backgroundColor: AppTheme.colors.border, borderRadius: 4, overflow: 'hidden' },
  playlistArtwork: { width: '50%', height: '50%' },
  playlistName: { color: AppTheme.colors.text, fontSize: 16, fontWeight: '600', marginTop: 8 },
  playlistSubtext: { color: '#A0A0A0', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: AppTheme.colors.text, marginTop: 20 },
  emptySubtitle: { fontSize: 16, color: '#A0A0A0', marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '85%', backgroundColor: AppTheme.colors.card, borderRadius: 12, padding: 20 },
  modalTitle: { color: AppTheme.colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { backgroundColor: AppTheme.colors.background, color: AppTheme.colors.text, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10, marginLeft: 20 },
  createButton: { backgroundColor: AppTheme.colors.primary, borderRadius: 8 },
  modalButtonText: { color: AppTheme.colors.text, fontSize: 16, fontWeight: 'bold' },
});
