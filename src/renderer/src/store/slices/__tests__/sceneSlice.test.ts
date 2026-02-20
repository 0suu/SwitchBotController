// src/renderer/src/store/slices/__tests__/sceneSlice.test.ts
import scenesReducer, {
  clearScenesState,
  setNightLightSceneForDevice,
  setSceneOrder,
  ScenesState,
} from '../sceneSlice';
import { isDraft } from "immer";

describe('sceneSlice reducers', () => {
  const initialState: ScenesState = {
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
  };

  it('should handle initial state', () => {
    expect(scenesReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setNightLightSceneForDevice to assign a scene', () => {
    const setSpy = window.electronStore.set as jest.Mock;
    setSpy.mockClear();
    const actual = scenesReducer(
      initialState,
      setNightLightSceneForDevice({ deviceId: 'device-123', sceneId: 'scene-456' })
    );
    expect(actual.nightLightSceneMap['device-123']).toEqual('scene-456');
    expect(setSpy).toHaveBeenCalledWith(
      'nightLightSceneAssignments',
      expect.objectContaining({ 'device-123': 'scene-456' })
    );
    const persistedMap = setSpy.mock.calls[setSpy.mock.calls.length - 1]?.[1];
    expect(isDraft(persistedMap)).toBe(false);
  });

  it('should handle setNightLightSceneForDevice to clear a scene assignment', () => {
    const stateWithAssignment: ScenesState = {
      ...initialState,
      nightLightSceneMap: { 'device-123': 'scene-456' },
    };
    const actual = scenesReducer(
      stateWithAssignment,
      setNightLightSceneForDevice({ deviceId: 'device-123', sceneId: null })
    );
    expect(actual.nightLightSceneMap['device-123']).toBeUndefined();
  });

  it('should handle setSceneOrder', () => {
    const setSpy = window.electronStore.set as jest.Mock;
    setSpy.mockClear();
    const sceneOrder = ['scene-1', 'scene-2', 'scene-3'];
    const actual = scenesReducer(initialState, setSceneOrder(sceneOrder));
    expect(actual.sceneOrder).toEqual(sceneOrder);
    expect(actual.sceneOrderLoaded).toBe(true);
    expect(setSpy).toHaveBeenCalledWith('sceneOrder', sceneOrder);
  });

  it('should preserve night light scene assignments when clearing scenes state', () => {
    const stateWithData: ScenesState = {
      ...initialState,
      scenes: [{ sceneId: 'scene-1', sceneName: 'Test Scene' }],
      nightLightSceneMap: { 'device-123': 'scene-456' },
      nightLightScenesLoaded: true,
      sceneOrder: ['scene-1', 'scene-2'],
      sceneOrderLoaded: true,
      isLoading: false,
      error: 'Some error',
      lastFetched: 123456,
    };
    const actual = scenesReducer(stateWithData, clearScenesState());
    
    // Night light scene assignments and their loaded state should be preserved
    expect(actual.nightLightSceneMap).toEqual({ 'device-123': 'scene-456' });
    expect(actual.nightLightScenesLoaded).toBe(true);
    
    // Scene order should be preserved
    expect(actual.sceneOrder).toEqual(['scene-1', 'scene-2']);
    expect(actual.sceneOrderLoaded).toBe(true);
    
    // Other state should be reset
    expect(actual.scenes).toEqual([]);
    expect(actual.isLoading).toBe(false);
    expect(actual.error).toBeNull();
    expect(actual.lastFetched).toBeNull();
  });

  it('should preserve multiple night light scene assignments when clearing scenes state', () => {
    const stateWithMultipleAssignments: ScenesState = {
      ...initialState,
      nightLightSceneMap: {
        'device-1': 'scene-1',
        'device-2': 'scene-2',
        'device-3': 'scene-3',
      },
      nightLightScenesLoaded: true,
    };
    const actual = scenesReducer(stateWithMultipleAssignments, clearScenesState());
    
    expect(actual.nightLightSceneMap).toEqual({
      'device-1': 'scene-1',
      'device-2': 'scene-2',
      'device-3': 'scene-3',
    });
    expect(actual.nightLightScenesLoaded).toBe(true);
  });
});
