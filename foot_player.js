import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme } from './colors';
import { usePlayer } from './PlayerContext';

// Import the actual screens
import HomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import LibraryScreen from './LibraryScreen';
import DownloadsScreen from './DownloadsScreen';

const Tab = createBottomTabNavigator();

// Removed MiniPlayer component from here. It will be moved to App.js for global persistence.

// The main tab navigator, with real screens
const FooterNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Using a createNativeStackNavigator for each tab to handle headers correctly
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
  );
}

// The root layout component that now only includes the navigator
export default function AppLayout() {
    return (
        <View style={{ flex: 1 }}>
            <FooterNavigator />
            {/* MiniPlayer is no longer here */}
        </View>
    )
}

const styles = StyleSheet.create({
    // MiniPlayer related styles are removed or moved if they were here.
    // Keeping this style block for other potential uses in foot_player if any.
    // If these styles were only for the MiniPlayer, they can be entirely removed.
});
