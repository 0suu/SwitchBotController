import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { DeviceControls } from "../DeviceControls";
import { AnyDevice } from "../../../api/types";
import {
  COMMAND_TURN_ON,
  COMMAND_TYPE_COMMAND,
  DEFAULT_PARAMETER,
} from "../../constants/commandConstants";

const mockSendDeviceCommand = jest.fn((payload: unknown) => ({
  type: "devices/sendCommand",
  payload,
}));
const mockClearDeviceCommandError = jest.fn((deviceId: string) => ({
  type: "devices/clearDeviceCommandError",
  payload: deviceId,
}));

jest.mock("../../constants/commandConstants", () => {
  const actual = jest.requireActual("../../constants/commandConstants");
  return {
    ...actual,
    COMMAND_TURN_ON: "__test_turn_on__",
    DEFAULT_PARAMETER: "__test_default__",
    COMMAND_TYPE_COMMAND: "__test_command_type__",
  };
});

jest.mock("../../store/slices/deviceSlice", () => ({
  clearDeviceCommandError: (deviceId: string) =>
    mockClearDeviceCommandError(deviceId),
  sendDeviceCommand: (payload: unknown) => mockSendDeviceCommand(payload),
  selectCommandErrorForDevice: () => null,
  selectIsCommandSendingForDevice: () => false,
}));

jest.mock("../../useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("DeviceControls", () => {
  const mockDevice: AnyDevice = {
    deviceId: "test-device-id",
    deviceName: "Test Device",
    deviceType: "Bot",
    enableCloudService: true,
    hubDeviceId: "hub-id",
  };

  const createTestStore = () =>
    configureStore({
      reducer: {
        settings: () => ({
          apiToken: "token",
          apiSecret: "secret",
          isTokenValidated: true,
        }),
        scenes: () => ({
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
        }),
      },
    });

  beforeEach(() => {
    mockSendDeviceCommand.mockClear();
    mockClearDeviceCommandError.mockClear();
  });

  it("sends turn-on command payload using command constants", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <DeviceControls device={mockDevice} />
      </Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Turn On" }));

    expect(mockClearDeviceCommandError).toHaveBeenCalledWith(mockDevice.deviceId);
    expect(mockSendDeviceCommand).toHaveBeenCalledWith({
      deviceId: mockDevice.deviceId,
      command: COMMAND_TURN_ON,
      parameter: DEFAULT_PARAMETER,
      commandType: COMMAND_TYPE_COMMAND,
    });
  });
});
