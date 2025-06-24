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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from './colors';
import * as spotify from './spotify';
import { handleSmartSearch } from './handleSmartSearch';
import { usePlayer } from './PlayerContext';
import { TrackListItem } from './components/TrackListItem';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const fallbackImage = 'https://placehold.co/500x500.png';

// --- Component Definitions ---

const MediaCard = ({ item, type, onPress }) => {
  const imageUrl = item.images?.[0]?.url || item.album?.images?.[0]?.url;
  const subtext = type === 'playlist' 
    ? (item.owner?.display_name ? `by ${item.owner.display_name}` : 'Playlist')
    : (item.artists?.map((a) => a.name).join(', ') || 'Album');

  return (
    <TouchableOpacity style={styles.gridCardContainer} onPress={onPress}>
      <Image source={imageUrl ? { uri: imageUrl } : fallbackImage} style={styles.gridCardImage} />
      <Text style={styles.gridCardText} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.gridCardSubtext} numberOfLines={1}>{subtext}</Text>
    </TouchableOpacity>
  );
};

const ArtistGridCard = ({ item, onPress }) => {
  const imageUrl = item.images?.[0]?.url;
  return (
    <TouchableOpacity style={styles.gridCardContainer} onPress={onPress}>
      <Image source={imageUrl ? { uri: imageUrl } : fallbackImage} style={styles.artistGridImage} />
      <Text style={styles.gridCardText} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.gridCardSubtext} numberOfLines={1}>Artist</Text>
    </TouchableOpacity>
  );
};

// --- Main Screen Component ---

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { playTrack } = usePlayer();

  const handleSearch = () => {
    handleSmartSearch(query, setSearchResults, setIsLoading);
  };

  const buildSections = () => {
    if (!searchResults) return [];

    const sections = [];
    const { tracks, albums, artists, playlists } = searchResults;

    // Tracks Section (Vertical List)
    if (tracks?.items?.length > 0) {
      sections.push({
        title: 'Tracks',
        data: tracks.items.filter(Boolean),
        renderItem: ({ item }) => (
            <TrackListItem 
                track={item} 
                onPress={() => playTrack(item, tracks.items)} 
            />
        ),
      });
    }

    const renderGrid = (data, type) => {
        // Chunk data into pairs for the two-row layout
        const chunkedData = [];
        for (let i = 0; i < data.length; i += 2) {
            chunkedData.push(data.slice(i, i + 2));
        }
        
        return (
            <FlatList
                data={chunkedData}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => `${type}-chunk-${index}`}
                contentContainerStyle={styles.horizontalGridContainer}
                // Removed snapping properties for smooth, momentum-based scrolling
                renderItem={({ item: pair }) => (
                    <View style={styles.gridColumn}>
                        {pair[0] && (
                            type === 'artist' ?
                            <ArtistGridCard item={pair[0]} onPress={() => navigation.navigate('ArtistDetails', { artist: pair[0] })} /> :
                            <MediaCard item={pair[0]} type={type} onPress={() => navigation.navigate(type === 'album' ? 'AlbumDetails' : 'PlaylistDetails', { [type]: pair[0] })} />
                        )}
                        {pair[1] && (
                             type === 'artist' ?
                             <ArtistGridCard item={pair[1]} onPress={() => navigation.navigate('ArtistDetails', { artist: pair[1] })} /> :
                             <MediaCard item={pair[1]} type={type} onPress={() => navigation.navigate(type === 'album' ? 'AlbumDetails' : 'PlaylistDetails', { [type]: pair[1] })} />
                        )}
                    </View>
                )}
            />
        );
    };

    if (artists?.items?.length > 0) {
      sections.push({ title: 'Artists', data: [artists.items.filter(Boolean)], renderItem: ({ item }) => renderGrid(item, 'artist') });
    }
    if (albums?.items?.length > 0) {
      sections.push({ title: 'Albums', data: [albums.items.filter(Boolean)], renderItem: ({ item }) => renderGrid(item, 'album') });
    }
    if (playlists?.items?.length > 0) {
      sections.push({ title: 'Playlists', data: [playlists.items.filter(Boolean)], renderItem: ({ item }) => renderGrid(item, 'playlist') });
    }
    
    return sections;
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <Text style={styles.header}>Search</Text>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for songs, albums, or artists..."
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
      
      {!isLoading && searchResults && buildSections().length === 0 && query.trim() !== '' && (
        <Text style={styles.noResultsText}>No results found for "{query}"</Text>
      )}

      <SectionList
        sections={buildSections()}
        keyExtractor={(item, index) => item.id || `section-item-${index}`}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item, section }) => section.renderItem({ item })}
        ListFooterComponent={<View style={{ height: 150 }} />}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
  header: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  searchInputContainer: { flexDirection: 'row', backgroundColor: AppTheme.colors.card, borderRadius: 8, padding: 12, marginHorizontal: 16, alignItems: 'center', marginBottom: 10 },
  searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 16, marginRight: 10 },
  noResultsText: { color: AppTheme.colors.text, textAlign: 'center', marginTop: 30, fontSize: 16 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10 },
  
  // --- Grid Styles ---
  horizontalGridContainer: {
      paddingHorizontal: 16, // Adds space at the start and end of the list
  },
  gridColumn: {
      width: SCREEN_WIDTH * 0.4, // Each column takes 40% of the screen width
      marginRight: 16, // This creates the gap between columns
  },
  gridCardContainer: {
    marginBottom: 20, // Vertical gap between the two rows
  },
  gridCardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  artistGridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 999, // Circular for artists
    marginBottom: 8,
  },
  gridCardText: {
    color: AppTheme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  gridCardSubtext: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
  },
});
