// src/renderer/src/components/__tests__/SettingsScreen.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from '@store/slices/settingsSlice'; // Using path alias
import { SettingsScreen } from '../SettingsScreen'; // Relative path to component

// Mock the MUI ThemeProvider and other context if needed, or wrap with a minimal theme
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act } from 'react';

const theme = createTheme();

// Minimal store for testing this component
const createTestStore = () => {
  return configureStore({
    reducer: {
      settings: settingsReducer,
      // devices: deviceReducer, // Add if SettingsScreen interacts with device state
    },
    // Preload state if needed for specific tests
    // preloadedState: { settings: { apiToken: 'test-token' } }
  });
};

describe('SettingsScreen', () => {
  it('renders the settings title', async () => {
    const store = createTestStore();
    await act(async () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <SettingsScreen />
          </ThemeProvider>
        </Provider>
      );
    });
    // Check for the main title "API Settings"
    // Using a matcher that is flexible with text content (e.g. to ignore case or partial matches if needed)
    expect(screen.getByText(/API Settings/i)).toBeInTheDocument();
  });

  // Add more tests:
  // - Input fields render
  // - Buttons render
  // - Interaction tests (typing, clicking) - may require more setup for async thunks
});
