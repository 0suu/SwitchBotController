// src/renderer/src/store/slices/__tests__/settingsSlice.test.ts
import settingsReducer, {
  setApiCredentials,
  clearApiCredentials,
  setTheme,
  SettingsState,
} from '../settingsSlice'; // Adjust path as needed

describe('settingsSlice reducers', () => {
  const initialState: SettingsState = {
    apiToken: null,
    apiSecret: null,
    isTokenValidated: false,
    validationMessage: null,
    pollingIntervalSeconds: 60,
    theme: 'system',
    logRetentionDays: 7,
    language: 'en',
  };

  it('should handle initial state', () => {
    expect(settingsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setApiCredentials', () => {
    const actual = settingsReducer(
      initialState,
      setApiCredentials({ token: 'test-token', secret: 'test-secret' })
    );
    expect(actual.apiToken).toEqual('test-token');
    expect(actual.apiSecret).toEqual('test-secret');
    // expect(actual.isTokenValidated).toEqual(false); // Validation is a separate step
  });

  it('should handle clearApiCredentials', () => {
    const filledState: SettingsState = { ...initialState, apiToken: 't', apiSecret: 's', isTokenValidated: true };
    const actual = settingsReducer(filledState, clearApiCredentials());
    expect(actual.apiToken).toBeNull();
    expect(actual.apiSecret).toBeNull();
    expect(actual.isTokenValidated).toBe(false);
  });

  it('should handle setTheme', () => {
    const actual = settingsReducer(initialState, setTheme('light'));
    expect(actual.theme).toEqual('light');
  });
});
