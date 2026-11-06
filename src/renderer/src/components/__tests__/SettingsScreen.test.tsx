// src/renderer/src/components/__tests__/SettingsScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  const originalUpdater = window.autoUpdater;
  afterEach(() => { window.autoUpdater = originalUpdater; });

  function mockUpdater(manualUpdates = false) {
    window.autoUpdater = {
      getMode: jest.fn().mockResolvedValue(manualUpdates ? "manual" : "automatic"),
      checkForUpdates: jest.fn().mockResolvedValue({ success: false, error: 'Unavailable' }),
      installUpdate: jest.fn(),
      onUpdateAvailable: jest.fn(() => jest.fn()),
      onUpdateNotAvailable: jest.fn(() => jest.fn()),
      onUpdateError: jest.fn(() => jest.fn()),
      onUpdateDownloaded: jest.fn(() => jest.fn()),
      onDownloadProgress: jest.fn(() => jest.fn()),
    };
  }

  async function renderSettings() {
    await act(async () => {
      render(<Provider store={createTestStore()}><SettingsScreen /></Provider>);
    });
  }

  it('explains manual Linux updates without offering an unsupported check', async () => {
    mockUpdater(true);
    await renderSettings();
    expect(screen.getByText(/Update manually using/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check for updates/i })).not.toBeInTheDocument();
    expect(window.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('explains source-mode update availability without Linux archive instructions', async () => {
    mockUpdater();
    (window.autoUpdater.getMode as jest.Mock).mockResolvedValue("development");
    await renderSettings();
    expect(screen.getByText(/Automatic updates are unavailable when running from source/)).toBeInTheDocument();
    expect(screen.queryByText(/Update manually using/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check for updates/i })).not.toBeInTheDocument();
  });

  it.each(['failure response', 'rejected IPC'])('reenables update checking after %s', async (failure) => {
    mockUpdater();
    if (failure === 'rejected IPC') {
      (window.autoUpdater.checkForUpdates as jest.Mock).mockRejectedValue(new Error('Disconnected'));
    }
    await renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /Check for updates/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Check for updates/i })).toBeEnabled());
    expect(screen.getByText('Update check failed.')).toBeInTheDocument();
  });

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
    expect(screen.getByRole('heading', { name: /Settings/i, level: 4 })).toBeInTheDocument();
  });

  // Add more tests:
  // - Input fields render
  // - Buttons render
  // - Interaction tests (typing, clicking) - may require more setup for async thunks
});
