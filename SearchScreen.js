import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  SectionList,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from './colors';
import * as spotify from './spotify';
import { TrackListItem } from './components/TrackListItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const fallbackImage = require('./assets/icon.png');

const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

const MediaCard = ({ item, onPress, type }) => {
  let imageUrl = null;
  let title = item.name;
  let subtext = '';

  if (type === 'track') {
    imageUrl = item.album?.images?.[0]?.url;
    subtext = item.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  } else if (type === 'album') {
    imageUrl = item.images?.[0]?.url;
    subtext = item.artists?.map((a) => a.name).join(', ') || 'Album';
  } else if (type === 'playlist') {
    imageUrl = item.images?.[0]?.url;
    subtext = item.owner?.display_name ? `by ${item.owner.display_name}` : 'Playlist';
  }

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <Image source={imageUrl ? { uri: imageUrl } : fallbackImage} style={styles.cardImage} />
      <Text style={styles.cardText} numberOfLines={1}>{title}</Text>
      <Text style={styles.cardSubtext} numberOfLines={1}>{subtext}</Text>
    </TouchableOpacity>
  );
};

const ArtistGridCard = ({ item, onPress }) => {
  const imageUrl = item.images?.[0]?.url;
  return (
    <TouchableOpacity style={styles.artistGridCardItem} onPress={onPress}>
      <Image source={imageUrl ? { uri: imageUrl } : fallbackImage} style={styles.artistGridImage} />
      <Text style={styles.artistGridText} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.artistGridSubtext} numberOfLines={1}>Artist</Text>
    </TouchableOpacity>
  );
};

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSearchResults(null);
    try {
      const results = await spotify.search(query);
      setSearchResults(results);
    } catch (e) {
      console.error("Failed to fetch search results:", e);
      Alert.alert('Error', 'Failed to fetch search results. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sections = [];

  if (searchResults) {
    const { tracks, albums, artists, playlists } = searchResults;

    const allTracks = (tracks?.items || []).filter(Boolean);
    if (allTracks.length > 0) {
      sections.push({
        title: 'Tracks',
        data: allTracks,
        renderItem: ({ item }) => <TrackListItem track={item} onPress={() => console.log('Play', item.name)} />, 
      });
    }

    const allArtists = (artists?.items || []).filter(Boolean);
    const chunkedArtists = chunkArray(allArtists, 2);
    if (chunkedArtists.length > 0) {
      sections.push({
        title: 'Artists',
        data: ['artists'],
        renderItem: () => (
          <FlatList
            data={chunkedArtists}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `artist-chunk-${i}`}
            snapToInterval={SCREEN_WIDTH * 0.5}
            pagingEnabled
            decelerationRate="fast"
            renderItem={({ item: pair }) => (
              <View style={styles.twoRowHorizontalContainer}>
                {pair[0] && <ArtistGridCard item={pair[0]} onPress={() => navigation.navigate('ArtistDetails', { artist: pair[0] })} />}
                {pair[1] && <ArtistGridCard item={pair[1]} onPress={() => navigation.navigate('ArtistDetails', { artist: pair[1] })} />}
              </View>
            )}
            contentContainerStyle={styles.horizontalSectionListContent}
          />
        ),
      });
    }

    const allAlbums = (albums?.items || []).filter(Boolean);
    const chunkedAlbums = chunkArray(allAlbums, 2);
    if (chunkedAlbums.length > 0) {
      sections.push({
        title: 'Albums',
        data: ['albums'],
        renderItem: () => (
          <FlatList
            data={chunkedAlbums}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `album-chunk-${i}`}
            snapToInterval={SCREEN_WIDTH * 0.5}
            pagingEnabled
            decelerationRate="fast"
            renderItem={({ item: pair }) => (
              <View style={styles.twoRowHorizontalContainer}>
                {pair[0] && <MediaCard item={pair[0]} type="album" onPress={() => navigation.navigate('AlbumDetails', { album: pair[0] })} />}
                {pair[1] && <MediaCard item={pair[1]} type="album" onPress={() => navigation.navigate('AlbumDetails', { album: pair[1] })} />}
              </View>
            )}
            contentContainerStyle={styles.horizontalSectionListContent}
          />
        ),
      });
    }

    const allPlaylists = (playlists?.items || []).filter(Boolean);
    const chunkedPlaylists = chunkArray(allPlaylists, 2);
    if (chunkedPlaylists.length > 0) {
      sections.push({
        title: 'Playlists',
        data: ['playlists'],
        renderItem: () => (
          <FlatList
            data={chunkedPlaylists}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `playlist-chunk-${i}`}
            snapToInterval={SCREEN_WIDTH * 0.5}
            pagingEnabled
            decelerationRate="fast"
            renderItem={({ item: pair }) => (
              <View style={styles.twoRowHorizontalContainer}>
                {pair[0] && <MediaCard item={pair[0]} type="playlist" onPress={() => navigation.navigate('PlaylistDetails', { playlist: pair[0] })} />}
                {pair[1] && <MediaCard item={pair[1]} type="playlist" onPress={() => navigation.navigate('PlaylistDetails', { playlist: pair[1] })} />}
              </View>
            )}
            contentContainerStyle={styles.horizontalSectionListContent}
          />
        ),
      });
    }
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      <Text style={styles.header}>Search</Text>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for songs, albums, or playlists..."
          placeholderTextColor="#A0A0A0"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleSearch}>
          <Ionicons name="search" size={24} color={AppTheme.colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ marginTop: 20 }} />}
      {!isLoading && searchResults && sections.length === 0 && query.trim() !== '' && (
        <Text style={styles.noResultsText}>No results found for "{query}"</Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `section-item-${index}`}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item, section }) => section.renderItem({ item })}
        ListFooterComponent={<View style={{ height: 150 }} />}
        style={{ width: '100%' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
  header: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  searchInputContainer: { flexDirection: 'row', backgroundColor: AppTheme.colors.card, borderRadius: 8, padding: 12, width: '92%', alignSelf: 'center', alignItems: 'center', marginBottom: 10 },
  searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 16, marginRight: 10 },
  noResultsText: { color: AppTheme.colors.text, textAlign: 'center', marginTop: 30, fontSize: 16 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingVertical: 10 },
  twoRowHorizontalContainer: { flexDirection: 'column', width: SCREEN_WIDTH * 0.5, marginRight: 10, justifyContent: 'space-between', height: 360 },
  cardContainer: { width: '100%', alignItems: 'flex-start', paddingVertical: 8 },
  cardImage: { width: 130, height: 130, borderRadius: 8, marginBottom: 8 },
  cardText: { color: AppTheme.colors.text, fontWeight: '600', fontSize: 14, width: '100%' },
  cardSubtext: { color: '#A0A0A0', fontSize: 12, marginTop: 2, width: '100%' },
  artistGridCardItem: { width: '100%', alignItems: 'center', paddingVertical: 8 },
  artistGridImage: { width: 130, height: 130, borderRadius: 999, marginBottom: 8 },
  artistGridText: { color: AppTheme.colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center', width: '100%' },
  artistGridSubtext: { color: '#A0A0A0', fontSize: 12, marginTop: 2, textAlign: 'center', width: '100%' },
  horizontalSectionListContent: { paddingHorizontal: 16 },
});