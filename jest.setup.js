// jest.setup.js
require('@testing-library/jest-dom'); // Adds custom jest-dom matchers

// Mock Electron store if tests try to access window.electronStore
// This is a basic mock. More specific mocks might be needed per test.
global.window.electronStore = {
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue({ success: true }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  getAll: jest.fn().mockResolvedValue({}),
};

// Mock SwitchBot bridge to avoid IPC calls during tests
global.window.switchBotBridge = {
  getDevices: jest.fn().mockResolvedValue({
    success: true,
    data: { statusCode: 100, body: { deviceList: [], infraredRemoteList: [] } },
  }),
  getDeviceStatus: jest.fn().mockResolvedValue({
    success: true,
    data: { statusCode: 100, body: {} },
  }),
  sendCommand: jest.fn().mockResolvedValue({
    success: true,
    data: { statusCode: 100, message: "OK", body: {} },
  }),
  getScenes: jest.fn().mockResolvedValue({
    success: true,
    data: { statusCode: 100, body: [] },
  }),
  executeScene: jest.fn().mockResolvedValue({
    success: true,
    data: { statusCode: 100, message: "OK", body: {} },
  }),
};

// Mock matchMedia, common for MUI components under Jest
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// You can add other global mocks or setup here
