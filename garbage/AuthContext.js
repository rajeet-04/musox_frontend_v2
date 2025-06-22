import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api as spotifyApi } from './spotify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Simplified authMode: 'guest' or 'user'. Starts as 'guest'.
  const [authMode, setAuthMode] = useState('guest'); 

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await SecureStore.getItemAsync('spotify_access_token');
        if (token) {
          // If a token exists, try to validate it.
          const profile = await spotifyApi('/me', token);
          setUserProfile(profile);
          setUserToken(token);
          setAuthMode('user'); // Upgrade to user mode if token is valid
        }
      } catch (e) {
        console.warn('Could not validate stored token, continuing as guest.', e.message);
        // If token is invalid, stay in guest mode.
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const login = async () => {
    // This function is now called *after* a successful auth prompt
    const token = await SecureStore.getItemAsync('spotify_access_token');
    if (token) {
        const profile = await spotifyApi('/me', token);
        setUserProfile(profile);
        setUserToken(token);
        setAuthMode('user');
    }
  };

  const logout = async () => {
    setUserToken(null);
    setUserProfile(null);
    await SecureStore.deleteItemAsync('spotify_access_token');
    await SecureStore.deleteItemAsync('spotify_refresh_token');
    setAuthMode('guest'); // Revert to guest mode
  };

  // This unified api function will automatically use the correct token
  const api = (endpoint, options) => {
    return spotifyApi(endpoint, userToken, options);
  };

  return (
    <AuthContext.Provider value={{ userToken, userProfile, authMode, isLoading, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
