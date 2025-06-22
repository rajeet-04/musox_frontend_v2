import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../colors';
import { promptForAuth } from './spotify'; // We will create this function next
import { useAuth } from './AuthContext';

export default function LoginScreen() {
    const { login } = useAuth();

    const handleLogin = async () => {
        const success = await promptForAuth();
        if (success) {
            // The token is now stored securely, AuthContext will handle the rest
            // We just need to trigger the login state change in the context
            login(true); // pass a truthy value to set the accessToken state
        } else {
            // Handle failed login, maybe show an alert
            console.log("Login failed");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="musical-notes" size={100} color={AppTheme.colors.primary} />
                <Text style={styles.title}>Musox</Text>
                <Text style={styles.subtitle}>Your Music, Your Rules.</Text>
            </View>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Image source={{ uri: 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_White.png' }} style={styles.spotifyLogo} />
                <Text style={styles.loginButtonText}>CONNECT WITH SPOTIFY</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        marginTop: 20,
    },
    subtitle: {
        fontSize: 18,
        color: '#A0A0A0',
        marginTop: 8,
    },
    loginButton: {
        backgroundColor: '#1DB954',
        borderRadius: 50,
        paddingVertical: 15,
        paddingHorizontal: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 40,
    },
    spotifyLogo: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});