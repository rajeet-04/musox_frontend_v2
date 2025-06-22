import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createApiClient } from './spotify';

const ApiContext = createContext();

// Load the default app keys from your .env file
const DEFAULT_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
const DEFAULT_CLIENT_SECRET = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;

export const ApiProvider = ({ children }) => {
    // Initialize the API client with the default keys first.
    const [apiClient, setApiClient] = useState(() => createApiClient(DEFAULT_CLIENT_ID, DEFAULT_CLIENT_SECRET));
    const [areCustomKeysSet, setAreCustomKeysSet] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // On app start, check for stored custom keys.
        const loadKeys = async () => {
            try {
                const storedClientId = await SecureStore.getItemAsync('custom_client_id');
                const storedClientSecret = await SecureStore.getItemAsync('custom_client_secret');

                if (storedClientId && storedClientSecret) {
                    // If custom keys exist, create a new API client with them.
                    setApiClient(() => createApiClient(storedClientId, storedClientSecret));
                    setAreCustomKeysSet(true);
                }
            } catch (e) {
                console.error("Failed to load custom API keys from storage.", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadKeys();
    }, []);

    const saveCustomKeys = async (clientId, clientSecret) => {
        await SecureStore.setItemAsync('custom_client_id', clientId);
        await SecureStore.setItemAsync('custom_client_secret', clientSecret);
        // Create a new client with the new keys and update the state.
        setApiClient(() => createApiClient(clientId, clientSecret));
        setAreCustomKeysSet(true);
    };

    const clearCustomKeys = async () => {
        await SecureStore.deleteItemAsync('custom_client_id');
        await SecureStore.deleteItemAsync('custom_client_secret');
        // Revert to using the default API client.
        setApiClient(() => createApiClient(DEFAULT_CLIENT_ID, DEFAULT_CLIENT_SECRET));
        setAreCustomKeysSet(false);
    };

    return (
        <ApiContext.Provider value={{ apiClient, isLoading, areCustomKeysSet, saveCustomKeys, clearCustomKeys }}>
            {children}
        </ApiContext.Provider>
    );
};

export const useApi = () => useContext(ApiContext);
