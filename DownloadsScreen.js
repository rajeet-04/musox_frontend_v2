import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SectionList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from './colors';
import * as storage from './storage';
import DownloadManager from './downloader';
import { TrackListItem } from './components/TrackListItem';
import { usePlayer } from './PlayerContext';

// A component to render each item in the download queue
const QueueItem = ({ item }) => {
    let icon = "time-outline";
    let color = AppTheme.colors.text;

    switch (item.status) {
        case 'processing':
            icon = "sync-outline";
            color = AppTheme.colors.primary;
            break;
        case 'failed':
            icon = "alert-circle-outline";
            color = AppTheme.colors.notification;
            break;
        case 'queued':
        default:
            icon = "time-outline";
            color = AppTheme.colors.text;
            break;
    }

    return (
        <View style={styles.queueItemContainer}>
            <Ionicons name={icon} size={24} color={color} style={styles.queueIcon} />
            <View style={styles.queueInfo}>
                <Text style={styles.queueText} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.queueSubtext}>{item.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}</Text>
            </View>
            {item.status === 'processing' && <ActivityIndicator color={AppTheme.colors.primary} />}
        </View>
    );
};


export default function DownloadsScreen({ navigation }) {
    const [queue, setQueue] = useState([]);
    const [downloadedTracks, setDownloadedTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { playTrack } = usePlayer();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [queueData, downloadedData] = await Promise.all([
                storage.getDownloadQueue(),
                storage.getDownloadedTracks()
            ]);
            setQueue(queueData);
            setDownloadedTracks(Object.values(downloadedData));
        } catch (e) {
            console.error("Failed to load downloads screen data:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleProcessQueue = async () => {
        if (isProcessing || queue.length === 0) return;

        setIsProcessing(true);
        await DownloadManager.processQueue((updatedQueue) => {
            setQueue([...updatedQueue]);
        });
        
        await loadData();
        setIsProcessing(false);
        Alert.alert("Queue Processed", "Finished processing the download queue.");
    };

    const handleClearQueue = () => {
        Alert.alert(
            "Clear Queue",
            "Are you sure you want to remove all items from the download queue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All", style: "destructive",
                    onPress: async () => {
                        await storage.updateDownloadQueue([]);
                        setQueue([]);
                    },
                },
            ]
        );
    };
    
    const sections = [
        { title: `Download Queue`, data: queue, renderItem: ({ item }) => <QueueItem item={item} /> },
        { title: 'Completed', data: downloadedTracks, renderItem: ({ item }) => <TrackListItem track={item} onPress={() => playTrack(item, downloadedTracks)} /> }
    ].filter(s => s.data.length > 0);

    return (
        <SafeAreaView style={styles.screenContainer}>
            <View style={styles.header}>
                 <Text style={styles.headerTitle}>Downloads</Text>
                 <TouchableOpacity 
                    style={[styles.processButton, (isProcessing || queue.length === 0) && styles.disabledButton]}
                    onPress={handleProcessQueue}
                    disabled={isProcessing || queue.length === 0}
                 >
                    {isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                         <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
                         <Text style={styles.processButtonText}>Process ({queue.length})</Text>
                        </>
                    )}
                 </TouchableOpacity>
            </View>

            {isLoading ? (
                 <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ flex: 1 }} />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => item.id + index}
                    renderSectionHeader={({ section: { title, data } }) => (
                       <View style={styles.sectionHeaderContainer}>
                         <Text style={styles.sectionHeader}>{title}</Text>
                         {title.includes('Download Queue') && data.length > 0 && (
                             <TouchableOpacity onPress={handleClearQueue}>
                                 <Text style={styles.clearButtonText}>Clear All</Text>
                             </TouchableOpacity>
                         )}
                       </View>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="download-outline" size={80} color={AppTheme.colors.primary} />
                            <Text style={styles.emptyTitle}>No Downloads</Text>
                            <Text style={styles.emptySubtitle}>Queued and downloaded songs will appear here.</Text>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 150 }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: AppTheme.colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: AppTheme.colors.text },
    processButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppTheme.colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    processButtonText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
    disabledButton: { backgroundColor: AppTheme.colors.border },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    sectionHeader: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: AppTheme.colors.text, 
    },
    clearButtonText: {
        color: AppTheme.colors.primary,
        fontSize: 14,
    },
    queueItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: AppTheme.colors.card,
        marginHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8
    },
    queueIcon: { marginRight: 12 },
    queueInfo: { flex: 1 },
    queueText: { color: AppTheme.colors.text, fontSize: 16 },
    queueSubtext: { color: '#A0A0A0', fontSize: 12 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '30%' },
    emptyTitle: { fontSize: 24, fontWeight: 'bold', color: AppTheme.colors.text, marginTop: 20 },
    emptySubtitle: { fontSize: 16, color: '#A0A0A0', marginTop: 8, textAlign: 'center' },
});
