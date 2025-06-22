import { DarkTheme } from '@react-navigation/native';

/**
 * @file colors.js
 * @description Centralized color theme for the Musox application.
 */

// Define the permanent dark theme for the entire application
export const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#007ACC',        // Primary Accent
    background: '#121212',     // Background
    card: '#1F2F3A',           // Secondary Accent (used for cards, inputs etc.)
    text: '#E0E0E0',           // Primary Text
    border: '#2C2C2C',         // Borders / Dividers
    notification: '#D32F2F',   // A standard error red for notifications
  },
};
