import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from './colors';
import * as spotify from './spotify'; // Correct import
import { TrackListItem } from '../components/TrackListItem';

export default function SearchScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setResults(null);
        setError(null);
        try {
            const searchResults = await spotify.search(query);
            setResults(searchResults);
        } catch (e) {
            console.error("Search failed:", e);
            setError("Failed to fetch search results. Please check your connection or API keys.");
        } finally {
            setIsLoading(false);
        }
    };

    const tracks = results?.tracks?.items || [];

    return (
        <SafeAreaView style={styles.screenContainer}>
            <Text style={styles.header}>Search</Text>
            <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="What do you want to listen to?"
                    placeholderTextColor="#A0A0A0"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
            </View>

            {isLoading && <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ marginTop: 20 }} />}
            
            {error && <Text style={styles.errorText}>{error}</Text>}

            <FlatList
                data={tracks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TrackListItem track={item} />}
                ListEmptyComponent={() => (
                    !isLoading && results && tracks.length === 0 ? <Text style={styles.noResultsText}>No results found for "{query}"</Text> : null
                )}
                style={{ width: '100%' }}
                contentContainerStyle={{ paddingBottom: 150 }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    header: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
    searchInputContainer: { flexDirection: 'row', backgroundColor: AppTheme.colors.card, borderRadius: 8, paddingHorizontal: 12, width: '92%', alignSelf: 'center', alignItems: 'center', marginBottom: 10 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 16, height: 50 },
    noResultsText: { color: '#A0A0A0', textAlign: 'center', marginTop: 30, fontSize: 16 },
    errorText: { color: AppTheme.colors.notification, textAlign: 'center', marginTop: 20, fontSize: 16 },
});
