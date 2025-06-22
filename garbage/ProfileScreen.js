import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../colors';
import { useAuth } from './AuthContext';
import { promptForUserAuth } from './spotify';

export default function ProfileScreen() {
    const { userProfile, authMode, logout, login } = useAuth();

    const handleLogin = async () => {
        try {
            const success = await promptForUserAuth();
            if (success) {
                await login();
            } else {
                Alert.alert("Login Failed", "The authentication was cancelled.");
            }
        } catch (error) {
            Alert.alert("An Error Occurred", "Could not complete the login process.");
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out? You will lose access to your personalized content.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: logout }
            ]
        );
    };

    // Guest View
    if (authMode !== 'user' || !userProfile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.guestContainer}>
                    <Ionicons name="person-circle-outline" size={100} color={AppTheme.colors.primary} />
                    <Text style={styles.guestTitle}>Unlock Your Profile</Text>
                    <Text style={styles.guestSubtitle}>
                        Log in with your Spotify account to see your top tracks, saved playlists, and more.
                    </Text>
                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>LOG IN WITH SPOTIFY</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Logged-in User View
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.profileHeader}>
                    <Image
                        source={{ uri: userProfile.images?.[0]?.url || 'https://placehold.co/150' }}
                        style={styles.profileImage}
                    />
                    <Text style={styles.displayName}>{userProfile.display_name}</Text>
                    <Text style={styles.email}>{userProfile.email}</Text>
                    <Text style={styles.followerText}>{userProfile.followers.total} Followers</Text>
                </View>

                {/* You can add more user-specific sections here */}
                {/* For example, a list of their top artists or playlists */}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>LOG OUT</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppTheme.colors.background,
    },
    // Guest styles
    guestContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        textAlign: 'center',
    },
    guestTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        marginTop: 20,
        marginBottom: 10,
    },
    guestSubtitle: {
        fontSize: 16,
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    loginButton: {
        backgroundColor: AppTheme.colors.primary,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Profile styles
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 2,
        borderColor: AppTheme.colors.primary,
    },
    displayName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        marginTop: 20,
    },
    email: {
        fontSize: 16,
        color: '#A0A0A0',
        marginTop: 5,
    },
    followerText: {
        fontSize: 14,
        color: '#A0A0A0',
        marginTop: 10,
    },
    logoutButton: {
        margin: 20,
        marginTop: 40,
        padding: 15,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: AppTheme.colors.card,
    },
    logoutButtonText: {
        color: AppTheme.colors.notification,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

