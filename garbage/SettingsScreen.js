import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../colors';
import { useApi } from './ApiContext';

export default function SettingsScreen() {
    const { areCustomKeysSet, saveCustomKeys, clearCustomKeys } = useApi();
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!clientId.trim() || !clientSecret.trim()) {
            Alert.alert("Missing Information", "Please enter both a Client ID and a Client Secret.");
            return;
        }
        setIsSaving(true);
        try {
            // A simple test call to validate keys before saving
            // This is optional but good practice
            await saveCustomKeys(clientId, clientSecret);
            Alert.alert("Keys Saved", "The app will now use your custom API keys.");
        } catch (error) {
            Alert.alert("Invalid Keys", "Could not authenticate with the provided keys. Please check them and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        Alert.alert(
            "Clear Custom Keys",
            "Are you sure? The app will revert to using the default keys.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear Keys", style: "destructive", onPress: clearCustomKeys },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Ionicons name="cog-outline" size={80} color={AppTheme.colors.primary} />
                <Text style={styles.header}>API Settings</Text>
                <Text style={styles.description}>
                    For a personalized experience, you can provide your own Spotify Developer API keys.
                    The app will use its default keys if these are left blank.
                </Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="Your Spotify Client ID"
                    placeholderTextColor="#888"
                    value={clientId}
                    onChangeText={setClientId}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Your Spotify Client Secret"
                    placeholderTextColor="#888"
                    value={clientSecret}
                    onChangeText={setClientSecret}
                    autoCapitalize="none"
                    secureTextEntry
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save Custom Keys</Text>}
                </TouchableOpacity>

                {areCustomKeysSet && (
                    <TouchableOpacity onPress={handleClear}>
                        <Text style={styles.clearText}>Clear and Use Default Keys</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppTheme.colors.background },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppTheme.colors.text,
        marginTop: 20,
        marginBottom: 10,
    },
    description: {
        fontSize: 15,
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    input: {
        width: '100%',
        backgroundColor: AppTheme.colors.card,
        color: AppTheme.colors.text,
        padding: 15,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 15,
    },
    saveButton: {
        width: '100%',
        backgroundColor: AppTheme.colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        minHeight: 50,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    clearText: {
        color: AppTheme.colors.notification,
        fontSize: 14,
        marginTop: 25,
        textDecorationLine: 'underline',
    }
});
