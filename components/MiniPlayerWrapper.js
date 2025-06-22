import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../colors';
import { usePlayer } from '../PlayerContext';

const MiniPlayerWrapper = ({ children }) => {
  const { currentTrack, isPlaying, pauseTrack, resumeTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const routes = useNavigationState(state => state?.routes);
  const currentRouteName = routes?.[routes.length - 1]?.name;

  const hideOnScreens = ['AlbumDetails', 'ArtistDetails', 'PlaylistDetails'];
  const shouldHide = hideOnScreens.includes(currentRouteName) || !currentTrack;

  const playerBottom = insets.bottom + 60;

  return (
    <>
      {children}
      {!shouldHide && (
        <View style={[styles.playerContainer, { bottom: playerBottom }]}>
          <View style={styles.playerContent}>
            <Image
              source={{ uri: currentTrack.thumbnailUri || currentTrack.album?.images?.[0]?.url || 'https://placehold.co/44x44/1F2F3A/FFFFFF?text=?' }}
              style={styles.playerImage}
            />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>
                {currentTrack.spotifySongName || currentTrack.name}
              </Text>
              <Text style={styles.playerArtist} numberOfLines={1}>
                {currentTrack.spotifyArtists?.join(', ') || currentTrack.artists?.map(a => a.name).join(', ')}
              </Text>
            </View>
            <TouchableOpacity onPress={isPlaying ? pauseTrack : resumeTrack} style={styles.playerButton}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={AppTheme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: AppTheme.colors.card,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  playerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  playerImage: {
    width: 44,
    height: 44,
    borderRadius: 4,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  playerName: {
    color: AppTheme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerArtist: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  playerButton: {
    padding: 8,
  },
});

export default MiniPlayerWrapper;
