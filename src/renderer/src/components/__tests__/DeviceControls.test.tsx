import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DeviceControls } from '../DeviceControls';
import { AnyDevice } from '../../../api/types';
import { COMMAND_TURN_ON } from '../../constants/commandConstants';

// Mock translation
jest.mock('../../useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('DeviceControls', () => {
  const mockDevice: AnyDevice = {
    deviceId: 'test-device-id',
    deviceName: 'Test Device',
    deviceType: 'Bot',
    enableCloudService: true,
    hubDeviceId: 'hub-id',
  };

  const createTestStore = () => configureStore({
    reducer: {
      devices: (state = {
        devices: [mockDevice],
        remoteDevices: [],
        isLoading: false,
        error: null,
        lastFetched: null,
        deviceStatuses: {},
        deviceOrder: [],
        deviceOrderLoaded: false,
        selectedDevice: {
          status: null,
          isLoading: false,
          error: null,
          lastFetchedStatus: null,
          deviceId: null,
        },
        commandSending: false,
        commandError: null,
        isPollingStatus: false,
        commandErrorByDevice: {},
        commandSendingByDevice: {},
      }, action) => state,
      settings: (state = { apiToken: 'token', apiSecret: 'secret', isTokenValidated: true }, action) => state,
      scenes: (state = {
        scenes: [],
        isLoading: false,
        error: null,
        executingById: {},
        executionErrorById: {},
        lastFetched: null,
        lastExecutedSceneId: null,
        sceneOrder: [],
        sceneOrderLoaded: false,
        nightLightSceneMap: {},
        nightLightScenesLoaded: false,
      }, action) => state,
    }
  });

  it('renders Bot controls', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DeviceControls device={mockDevice} />
      </Provider>
    );

    // Check if "Bot" section is rendered
    expect(screen.getByText('Bot')).toBeInTheDocument();

    // Check if buttons with constant-derived labels/actions are present
    // Note: The button text is translated key, e.g. "On", "Off"
    // "Turn On" is the text in the button for Bot
    expect(screen.getByText('Turn On')).toBeInTheDocument();
  });
});
