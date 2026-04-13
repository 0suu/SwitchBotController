import { act, renderHook } from "@testing-library/react";
import { usePersistedDeviceControlState } from "../usePersistedDeviceControlState";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("usePersistedDeviceControlState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (window.electronStore.get as jest.Mock).mockReset();
    (window.electronStore.set as jest.Mock).mockReset();
    (window.electronStore.get as jest.Mock).mockResolvedValue(undefined);
    (window.electronStore.set as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("loads persisted values and merges them with defaults", async () => {
    (window.electronStore.get as jest.Mock).mockResolvedValue({
      acTemperature: 24,
    });

    const { result } = renderHook(() =>
      usePersistedDeviceControlState("device-1", "infraredRemote", {
        acTemperature: 26,
        acMode: "2",
      })
    );

    await act(async () => {
      await flushMicrotasks();
    });

    expect(window.electronStore.get).toHaveBeenCalledWith(
      "deviceControlDrafts.device-1.infraredRemote"
    );
    expect(result.current[0]).toEqual({
      acTemperature: 24,
      acMode: "2",
    });
    expect(window.electronStore.set).not.toHaveBeenCalled();
  });

  it("persists updated values after the debounce interval", async () => {
    const { result } = renderHook(() =>
      usePersistedDeviceControlState("device-2", "humidifier", {
        targetHumidify: 60,
        humidifierLevel: 50,
      })
    );

    await act(async () => {
      await flushMicrotasks();
    });

    (window.electronStore.set as jest.Mock).mockClear();

    act(() => {
      result.current[1]((current) => ({
        ...current,
        targetHumidify: 70,
      }));
    });

    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(window.electronStore.set).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(window.electronStore.set).toHaveBeenCalledWith(
      "deviceControlDrafts.device-2.humidifier",
      {
        targetHumidify: 70,
        humidifierLevel: 50,
      }
    );
  });
});
