import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from './PlayerContext';
import { AppTheme } from './colors';

export default function MiniPlayer({ onPlayerPress }) {
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, playbackStatus } = usePlayer();
  const insets = useSafeAreaInsets();

  if (!currentTrack) {
    return null;
  }

  const playerBottom = insets.bottom + 60; // Adjust as needed
  const progress = (playbackStatus?.positionMillis || 0) / (playbackStatus?.durationMillis || 1);

  return (
    <TouchableOpacity onPress={onPlayerPress} style={[styles.container, { bottom: playerBottom }]}>
        <View style={styles.content}>
            <Image
            source={{ uri: currentTrack.thumbnailUri || 'https://placehold.co/44x44/1F2F3A/FFFFFF?text=?' }}
            style={styles.image}
            />
            <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{currentTrack.name}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artists?.join(', ')}</Text>
            </View>
            <TouchableOpacity onPress={isPlaying ? pauseTrack : resumeTrack} style={styles.button}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={AppTheme.colors.text} />
            </TouchableOpacity>
        </View>
        <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 64,
    borderRadius: 8,
    backgroundColor: AppTheme.colors.card,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  name: {
    color: AppTheme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  artist: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  button: {
    padding: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: AppTheme.colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: AppTheme.colors.primary,
  },
});
