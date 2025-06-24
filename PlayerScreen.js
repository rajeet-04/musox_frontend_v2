import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system';
import { BlurView } from 'expo-blur';

import { AppTheme } from './colors';
import { usePlayer, usePlaybackStatus } from './PlayerContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatTime = (millis) => {
  if (!millis) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const parseLRC = (lrcContent) => {
  if (!lrcContent) return [];
  const lines = lrcContent.split('\n');
  const lyrics = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach(line => {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60000 + seconds * 1000 + milliseconds;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        lyrics.push({ time, text });
      }
    }
  });
  return lyrics;
};

export default function PlayerScreen({ isVisible, onClose }) {
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, seekTrack, playNextTrack, playPreviousTrack } = usePlayer();
  const playbackStatus = usePlaybackStatus();
  
  const [lyrics, setLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsContainerHeight, setLyricsContainerHeight] = useState(0); // State to hold the height of the lyrics view
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Refs for scrolling logic
  const lyricsScrollViewRef = useRef(null);
  const lyricLayoutsRef = useRef([]);
  
  const handleClose = () => {
    Animated.parallel([
        Animated.timing(slideAnimation, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnimation, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(onClose);
  };

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnimation, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnimation, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnimation.setValue(gestureState.dy);
                fadeAnimation.setValue(1 - (gestureState.dy / SCREEN_HEIGHT));
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > SCREEN_HEIGHT / 3) {
                handleClose();
            } else {
                Animated.parallel([
                    Animated.spring(slideAnimation, { toValue: 0, useNativeDriver: true }),
                    Animated.spring(fadeAnimation, { toValue: 1, useNativeDriver: true }),
                ]).start();
            }
        },
    })
  ).current;

  // Effect to load lyrics when the track changes
  useEffect(() => {
    const loadLyrics = async () => {
      setLyrics([]);
      lyricLayoutsRef.current = [];
      setActiveLyricIndex(-1);

      if (currentTrack?.lrcUri) {
        setIsLoadingLyrics(true);
        try {
          const lrcContent = await FileSystem.readAsStringAsync(currentTrack.lrcUri);
          setLyrics(parseLRC(lrcContent));
        } catch (e) { 
          setLyrics([]); 
          console.error("Failed to load or parse lyrics:", e);
        } finally { 
          setIsLoadingLyrics(false); 
        }
      } else { 
        setLyrics([]); 
      }
    };
    loadLyrics();
  }, [currentTrack]);

  // Effect to handle active lyric line and auto-scrolling
  useEffect(() => {
    if (lyrics.length > 0 && playbackStatus?.isLoaded && lyricsContainerHeight > 0) {
      const currentPosition = playbackStatus.positionMillis;
      
      const newIndex = lyrics.findIndex((line, index) => {
        const nextLine = lyrics[index + 1];
        return currentPosition >= line.time && (!nextLine || currentPosition < nextLine.time);
      });

      if (newIndex !== -1 && newIndex !== activeLyricIndex) {
        setActiveLyricIndex(newIndex);
        
        const layout = lyricLayoutsRef.current[newIndex];
        if (lyricsScrollViewRef.current && layout) {
            // New, more accurate calculation for the scroll position.
            // It uses the actual height of the lyrics container.
            const scrollPosition = layout.y - (lyricsContainerHeight / 2) + (layout.height / 2);
            lyricsScrollViewRef.current.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
        }
      }
    }
  }, [playbackStatus, lyrics, activeLyricIndex, lyricsContainerHeight]); // Added lyricsContainerHeight dependency

  if (!currentTrack) return null;

  const imageUri = currentTrack.thumbnailUri || 'https://placehold.co/500x500/1F2F3A/FFFFFF?text=?';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnimation }], opacity: fadeAnimation }]} {...panResponder.panHandlers}>
      <Image source={{ uri: imageUri }} style={styles.artworkBackground} blurRadius={40} />
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
         <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="chevron-down" size={32} color={AppTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentTrack.name}</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="list" size={28} color={AppTheme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.mainContent}><Image source={{ uri: imageUri }} style={styles.artwork} /></View>
        <View style={styles.playbackContainer}>
          <Text style={styles.trackTitle}>{currentTrack.name}</Text>
          <Text style={styles.artistName}>{currentTrack.artists?.join(', ')}</Text>
          <Slider style={styles.slider} minimumValue={0} maximumValue={playbackStatus?.durationMillis || 1} value={playbackStatus?.positionMillis || 0} onSlidingComplete={seekTrack} minimumTrackTintColor={AppTheme.colors.primary} maximumTrackTintColor={AppTheme.colors.border} thumbTintColor={AppTheme.colors.text} />
          <View style={styles.timeContainer}><Text style={styles.timeText}>{formatTime(playbackStatus?.positionMillis)}</Text><Text style={styles.timeText}>{formatTime(playbackStatus?.durationMillis)}</Text></View>
          <View style={styles.controlsContainer}><TouchableOpacity onPress={playPreviousTrack}><Ionicons name="play-skip-back" size={40} color={AppTheme.colors.text} /></TouchableOpacity><TouchableOpacity style={styles.playButton} onPress={isPlaying ? pauseTrack : resumeTrack}><Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color={AppTheme.colors.background} style={{ marginLeft: isPlaying ? 0 : 4 }} /></TouchableOpacity><TouchableOpacity onPress={playNextTrack}><Ionicons name="play-skip-forward" size={40} color={AppTheme.colors.text} /></TouchableOpacity></View>
        </View>
        <View 
            style={styles.lyricsSection}
            onLayout={(event) => {
                // Get the actual height of the lyrics container and store it
                setLyricsContainerHeight(event.nativeEvent.layout.height);
            }}
        >
          {isLoadingLyrics ? <ActivityIndicator color={AppTheme.colors.primary} /> : lyrics.length > 0 ? (
            <ScrollView 
              ref={lyricsScrollViewRef} 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={[
                  styles.lyricsContent,
                  // Use the dynamic height to set the initial padding
                  { paddingTop: lyricsContainerHeight > 0 ? lyricsContainerHeight / 2 : 0 }
              ]}
            >
              {lyrics.map((line, index) => (
                <Text 
                  key={index} 
                  onLayout={(event) => {
                    lyricLayoutsRef.current[index] = event.nativeEvent.layout;
                  }}
                  style={[
                    styles.lyricText, 
                    index === activeLyricIndex && styles.activeLyricText
                  ]}
                >
                  {line.text}
                </Text>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.lyricsPlaceholder}>
              <Text style={styles.lyricText}>No lyrics available.</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 100 },
  safeArea: { flex: 1, justifyContent: 'space-between' },
  artworkBackground: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 20 : 0 },
  headerButton: { padding: 6 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, color: AppTheme.colors.text, fontWeight: 'bold' },
  mainContent: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  artwork: { width: SCREEN_WIDTH * 0.8, aspectRatio: 1, borderRadius: 16 },
  playbackContainer: { alignItems: 'center', paddingHorizontal: 24 },
  trackTitle: { color: AppTheme.colors.text, fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  artistName: { color: '#A0A0A0', fontSize: 16, marginBottom: 8 },
  slider: { width: '100%', height: 40 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  timeText: { color: '#A0A0A0', fontSize: 12 },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginVertical: 10, width: '100%' },
  playButton: { backgroundColor: AppTheme.colors.text, width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  lyricsSection: { flex: 1, padding: 10 },
  lyricsContent: { paddingBottom: 60 }, // Removed the fixed padding from here
  lyricsPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lyricText: { color: '#A0A0A0', fontSize: 18, textAlign: 'center', marginVertical: 8 },
  activeLyricText: { color: AppTheme.colors.text, fontSize: 20, fontWeight: 'bold' },
});
