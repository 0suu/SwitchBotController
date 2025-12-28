import React, { useState, useEffect, useRef, useMemo } from "react"; // Added useRef
import { useDispatch, useSelector } from "react-redux";
import { ThemeProvider, createTheme, responsiveFontSizes } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import useMediaQuery from "@mui/material/useMediaQuery";

import { DeviceListScreen } from "./components/DeviceListScreen";
import { DeviceDetailScreen } from "./components/DeviceDetailScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ScenesScreen } from "./components/ScenesScreen";
import { HideOnScroll } from "./components/HideOnScroll";
import { AppDispatch } from "./store/store";
import { createAppTheme } from "./theme";
import {
  loadApiCredentials,
  selectIsTokenValidated,
  selectPollingInterval,
  selectApiToken,
  selectApiSecret,
  testApiCredentials,
  selectTheme,
} from "./store/slices/settingsSlice";
import { loadDeviceOrder, pollAllDeviceStatuses, selectAllDevices } from "./store/slices/deviceSlice"; // Added pollAllDeviceStatuses
import { loadNightLightSceneAssignments, loadSceneOrder } from "./store/slices/sceneSlice";
import { useTranslation } from "./useTranslation";

type View = "list" | "detail" | "settings" | "scenes";
const VIEW_STORAGE_KEY = "lastView";
const isPersistableView = (value: unknown): value is Exclude<View, "detail"> =>
  value === "list" || value === "settings" || value === "scenes";

function App() {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const isTokenValid = useSelector(selectIsTokenValidated);
  const storedToken = useSelector(selectApiToken);
  const storedSecret = useSelector(selectApiSecret);
  const pollingIntervalSetting = useSelector(selectPollingInterval); // In seconds
  const devicesInList = useSelector(selectAllDevices); // To check if there are devices to poll
  const physicalDeviceCount = devicesInList.filter((d) => !(d as any).isInfraredRemote).length;
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedAutoValidationRef = useRef(false);
  const themeSetting = useSelector(selectTheme);
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const paletteMode = themeSetting === "system" ? (prefersDarkMode ? "dark" : "light") : themeSetting;
  const theme = useMemo(() => createAppTheme(paletteMode), [paletteMode]);

  useEffect(() => {
    dispatch(loadApiCredentials());
    dispatch(loadDeviceOrder());
    dispatch(loadSceneOrder());
    dispatch(loadNightLightSceneAssignments());
  }, [dispatch]);

  // Restore the last opened top-level view on startup.
  useEffect(() => {
    let isMounted = true;
    const restoreLastView = async () => {
      try {
        const storedView = await window.electronStore.get(VIEW_STORAGE_KEY);
        if (isMounted && isPersistableView(storedView)) {
          setCurrentView(storedView);
        }
      } catch (error) {
        console.error("Failed to load last view from store:", error);
      }
    };
    restoreLastView();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist the current top-level view (excluding detail) whenever it changes.
  useEffect(() => {
    const persistView = async () => {
      try {
        const viewToPersist: Exclude<View, "detail"> =
          currentView === "detail" ? "list" : currentView;
        await window.electronStore.set(VIEW_STORAGE_KEY, viewToPersist);
      } catch (error) {
        console.error("Failed to save last view to store:", error);
      }
    };
    persistView();
  }, [currentView]);

  // Automatically validate stored credentials once on startup so the app
  // can start in a "logged-in" state when possible.
  useEffect(() => {
    if (hasAttemptedAutoValidationRef.current) return;
    if (!storedToken || !storedSecret) return;
    hasAttemptedAutoValidationRef.current = true;
    dispatch(testApiCredentials());
  }, [dispatch, storedToken, storedSecret]);

  // Effect for polling logic
  useEffect(() => {
    // Clear any existing timer
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    if (isTokenValid && pollingIntervalSetting > 0 && physicalDeviceCount > 0) {
      // Initial poll immediately so list displays data-type readings quickly
      dispatch(pollAllDeviceStatuses());

      pollingTimerRef.current = setInterval(() => {
        console.log(`Polling device statuses (Interval: ${pollingIntervalSetting}s)...`);
        dispatch(pollAllDeviceStatuses());
      }, pollingIntervalSetting * 1000); // Convert seconds to milliseconds

      console.log(`Status polling started. Interval: ${pollingIntervalSetting} seconds.`);
    } else {
      if (pollingTimerRef.current) { // This check is actually redundant due to the clear above, but harmless
        console.log("Status polling stopped (conditions not met or interval is 0).");
      }
    }

    // Cleanup function to clear interval when component unmounts or dependencies change
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
        console.log("Status polling stopped (cleanup).");
      }
    };
  }, [dispatch, isTokenValid, pollingIntervalSetting, physicalDeviceCount]); // Re-run if these change


  const navigateTo = (view: View) => { setCurrentView(view); };
  const handleDeviceSelect = (deviceId: string) => { setSelectedDeviceId(deviceId); navigateTo("detail"); };

  const renderView = () => {
    switch (currentView) {
      case "detail":
        return <DeviceDetailScreen deviceId={selectedDeviceId} onBack={() => navigateTo("list")} />;
      case "settings":
        return <SettingsScreen />;
      case "scenes":
        return <ScenesScreen />;
      case "list":
      default:
        return <DeviceListScreen onDeviceSelect={handleDeviceSelect} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "background.default" }}>
        <HideOnScroll>
          <AppBar position="fixed" color="default" elevation={0}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: "bold", letterSpacing: -0.5 }}>
                {t("App Title")}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  color={currentView === "list" ? "primary" : "inherit"}
                  onClick={() => navigateTo("list")}
                  variant={currentView === "list" ? "outlined" : "text"}
                >
                  {t("Devices")}
                </Button>
                <Button
                  color={currentView === "scenes" ? "primary" : "inherit"}
                  onClick={() => navigateTo("scenes")}
                  variant={currentView === "scenes" ? "outlined" : "text"}
                >
                  {t("Scenes")}
                </Button>
                <Button
                  color={currentView === "settings" ? "primary" : "inherit"}
                  onClick={() => navigateTo("settings")}
                  variant={currentView === "settings" ? "outlined" : "text"}
                >
                  {t("Settings")}
                </Button>
              </Box>
            </Toolbar>
          </AppBar>
        </HideOnScroll>
        <Toolbar /> {/* Spacer to prevent content from being hidden behind fixed AppBar */}
        <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
          {renderView()}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
