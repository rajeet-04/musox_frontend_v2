import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../colors'; // Adjust path if necessary

export const TrackListItem = ({
  track,
  onPress,
  onLongPress,
  isSelectionMode,
  isSelected,
}) => {
  // Determine the image URI: prioritize local thumbnail, then Spotify album art, then a placeholder
  const imageUri = track.thumbnailUri 
    || track.album?.images?.[0]?.url 
    || 'https://placehold.co/64x64/1F2F3A/FFFFFF?text=?'; // Fallback placeholder

  // Determine the track title: prioritize local name, then Spotify name
  const title = track.spotifySongName || track.name;

  // Determine the artist(s): prioritize local artists, then Spotify artists, then 'Unknown Artist'
  const artists = Array.isArray(track.spotifyArtists) 
    ? track.spotifyArtists.join(', ') 
    : (Array.isArray(track.artists) 
        ? track.artists.map(a => a.name).join(', ') 
        : 'Unknown Artist'
      );

  const containerStyle = [
    styles.container,
    isSelected && { backgroundColor: AppTheme.colors.card },
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.thumbnail}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artistText} numberOfLines={1}>
          {artists}
        </Text>
      </View>
      {isSelectionMode && (
        <Ionicons
          name={isSelected ? 'checkbox' : 'checkbox-outline'}
          size={24}
          color={AppTheme.colors.primary}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleText: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  artistText: {
    color: '#A0A0A0',
    fontSize: 14,
    marginTop: 2,
  },
});
