import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import { Buffer } from 'buffer';

import { PlayerProvider, usePlayer } from './PlayerContext';
import { DownloadProvider } from './DownloadContext';
import AppLayout from './foot_player';
import MiniPlayer from './MiniPlayer';
import PlayerScreen from './PlayerScreen';
import { AppTheme } from './colors';

// Import detail screens
import AlbumDetailsScreen from './components/AlbumDetailsScreen';
import ArtistDetailsScreen from './components/ArtistDetailsScreen';
import PlaylistDetailsScreen from './components/PlaylistDetailsScreen';
import UserPlaylistScreen from './UserPlaylistScreen';

global.Buffer = Buffer;
const Stack = createNativeStackNavigator();

const MusoxTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    ...AppTheme.colors,
  },
};

const AppContent = () => {
    const [isPlayerVisible, setIsPlayerVisible] = useState(false);
    const { currentTrack } = usePlayer();

    return (
        <>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="AppLayout" component={AppLayout} />
                    <Stack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
                    <Stack.Screen name="ArtistDetails" component={ArtistDetailsScreen} />
                    <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen}/>
                    <Stack.Screen  name="UserPlaylist"  component={UserPlaylistScreen}  options={{ headerShown: false }}/>
                </Stack.Navigator>
            </NavigationContainer>

            {/* Conditionally render MiniPlayer only if a track is playing and the full player is hidden */}
            {currentTrack && !isPlayerVisible && (
                <MiniPlayer onPlayerPress={() => setIsPlayerVisible(true)} />
            )}

            {isPlayerVisible && (
    <PlayerScreen 
        isVisible={isPlayerVisible} 
        onClose={() => setIsPlayerVisible(false)} 
    />
)}
        </>
    );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <DownloadProvider>
          <StatusBar style="light" />
          <AppContent />
        </DownloadProvider>
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
