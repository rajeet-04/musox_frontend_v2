import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme } from './colors';
import { usePlayer } from './PlayerContext';

import HomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import LibraryScreen from './LibraryScreen';
import DownloadsScreen from './DownloadsScreen';

const Tab = createBottomTabNavigator();

const MiniPlayer = () => {
    const { currentTrack, isPlaying, pauseTrack, resumeTrack } = usePlayer();
    const insets = useSafeAreaInsets();
    if (!currentTrack) return null;
    const playerBottom = insets.bottom + 60;
    return (
        <View style={[styles.playerContainer, { bottom: playerBottom }]}>
            <BlurView tint="dark" intensity={100} style={StyleSheet.absoluteFill}>
                <View style={styles.playerContent}>
                    <Image source={{ uri: currentTrack.album?.images?.[0]?.url || 'https://placehold.co/64' }} style={styles.playerImage} />
                    <View style={styles.playerInfo}>
                        <Text style={styles.playerName} numberOfLines={1}>{currentTrack.name}</Text>
                        <Text style={styles.playerArtist} numberOfLines={1}>
                            {currentTrack.artists?.map(a => a.name).join(', ')}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={isPlaying ? pauseTrack : resumeTrack} style={styles.playerButton}>
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={AppTheme.colors.text} />
                    </TouchableOpacity>
                </View>
            </BlurView>
        </View>
    );
};

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
                    else if (route.name === 'Library') iconName = focused ? 'library' : 'library-outline';
                    else if (route.name === 'Downloads') iconName = focused ? 'download' : 'download-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: AppTheme.colors.primary,
                tabBarInactiveTintColor: '#A0A0A0',
                tabBarStyle: {
                    position: 'absolute',
                    borderTopWidth: 0,
                    backgroundColor: 'transparent',
                    elevation: 0,
                },
                tabBarBackground: () => <BlurView tint="dark" intensity={95} style={StyleSheet.absoluteFill} />,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Search" component={SearchScreen} />
            <Tab.Screen name="Library" component={LibraryScreen} />
            <Tab.Screen name="Downloads" component={DownloadsScreen} />
        </Tab.Navigator>
        <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
    playerContainer: {
        position: 'absolute',
        left: 10,
        right: 10,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
    },
    playerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    playerImage: { width: 44, height: 44, borderRadius: 4 },
    playerInfo: { flex: 1, marginLeft: 10 },
    playerName: { color: AppTheme.colors.text, fontWeight: 'bold', fontSize: 14 },
    playerArtist: { color: '#A0A0A0', fontSize: 12 },
    playerButton: { padding: 8 },
});
