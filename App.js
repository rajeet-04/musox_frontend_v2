import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native'; // Added for MiniPlayer
import { Ionicons } from '@expo/vector-icons'; // Added for MiniPlayer icons

import { PlayerProvider, usePlayer } from './PlayerContext'; // Import usePlayer
import { DownloadProvider } from './DownloadContext';
import AppLayout from './foot_player'; // This is now just your main layout with tabs
import { AppTheme } from './colors';

// Import the new detail screens
import AlbumDetailsScreen from './components/AlbumDetailsScreen';
import ArtistDetailsScreen from './components/ArtistDetailsScreen';
import PlaylistDetailsScreen from './components/PlaylistDetailsScreen';
import { Buffer } from 'buffer';
global.Buffer = Buffer;


const Stack = createNativeStackNavigator();

// Create a complete theme by merging your custom colors with the default DarkTheme.
// This prevents errors by ensuring all required theme properties are defined.
const MusoxTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppTheme.colors.primary,
    background: AppTheme.colors.background,
    card: AppTheme.colors.card,
    text: AppTheme.colors.text,
    border: AppTheme.colors.border,
    notification: AppTheme.colors.notification,
  },
};

// The Mini Player Component, now defined globally in App.js
const MiniPlayer = () => {
    const { currentTrack, isPlaying, pauseTrack, resumeTrack } = usePlayer();
    const insets = useSafeAreaInsets();

    if (!currentTrack) {
        return null; // Don't render anything if no track is active
    }
    
    // Position the player above the tab bar, accounting for safe area insets
    const playerBottom = insets.bottom + 60; // 60 is approximate height of tab bar, adjust if needed

    return (
        <View style={[appStyles.playerContainer, { bottom: playerBottom }]}>
            {/* Note: BlurView import might be needed if you want it here and it's not global */}
            {/* For simplicity, using a solid background for now. */}
            {/* If you need BlurView, ensure 'expo-blur' is installed and imported here. */}
            <View style={appStyles.playerContent}>
                <Image source={{ uri: currentTrack.thumbnailUri || currentTrack.album?.images?.[0]?.url || 'https://placehold.co/44x44/1F2F3A/FFFFFF?text=?' }} style={appStyles.playerImage} />
                <View style={appStyles.playerInfo}>
                    <Text style={appStyles.playerName} numberOfLines={1}>{currentTrack.spotifySongName || currentTrack.name}</Text>
                    <Text style={appStyles.playerArtist} numberOfLines={1}>
                        {currentTrack.spotifyArtists?.join(', ') || currentTrack.artists?.map(a=>a.name).join(', ')}
                    </Text>
                </View>
                <TouchableOpacity onPress={isPlaying ? pauseTrack : resumeTrack} style={appStyles.playerButton}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={AppTheme.colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <DownloadProvider>
          <NavigationContainer theme={MusoxTheme}>
            <Stack.Navigator>
             
              <Stack.Screen
                name="AppLayout"
                component={AppLayout}
                options={{ headerShown: false }}
              />
              
              <Stack.Screen
                name="AlbumDetails"
                component={AlbumDetailsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ArtistDetails"
                component={ArtistDetailsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PlaylistDetails"
                component={PlaylistDetailsScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
          <MiniPlayer /> {/* Render MiniPlayer outside NavigationContainer */}
        </DownloadProvider>
      </PlayerProvider>
    </SafeAreaProvider>
  );
}

// Styles for the MiniPlayer, now within App.js or a separate global styles file
const appStyles = StyleSheet.create({
    playerContainer: {
        position: 'absolute',
        left: 10,
        right: 10,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: AppTheme.colors.card, // Using card background for now, add BlurView if desired
        elevation: 5, // For Android shadow
        shadowColor: '#000', // For iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 10, // Ensure it's above other content
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
