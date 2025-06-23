import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../colors';

const TrackListItemComponent = ({
  track,
  onPress,
  onLongPress,
  isSelectionMode,
  isSelected,
}) => {
  const imageUri = track.thumbnailUri 
    || track.album?.images?.[0]?.url 
    || 'https://placehold.co/64x64/1F2F3A/FFFFFF?text=?';

  const title = track.name;

  // This function now correctly handles both artist array formats.
  const getArtistNames = (artistsArray) => {
    if (!Array.isArray(artistsArray) || artistsArray.length === 0) {
      return 'Unknown Artist';
    }
    // Format 1: ["Artist A", "Artist B"]
    if (typeof artistsArray[0] === 'string') {
      return artistsArray.join(', ');
    }
    // Format 2: [{ name: "Artist A" }, { name: "Artist B" }]
    if (typeof artistsArray[0] === 'object' && artistsArray[0] !== null) {
      return artistsArray.map(a => a.name).filter(Boolean).join(', ');
    }
    return 'Unknown Artist';
  };

  const artists = getArtistNames(track.artists);

  const containerStyle = [
    styles.container,
    isSelected && styles.selectedContainer,
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

export const TrackListItem = React.memo(TrackListItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  selectedContainer: {
    backgroundColor: AppTheme.colors.card,
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
