import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";

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


  // ── Auto-updater state ─────────────────────────────────────────────
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    if (!window.autoUpdater) return;

    const unsubAvailable = window.autoUpdater.onUpdateAvailable((info) => {
      setUpdateVersion(info.version);
      setDownloadProgress(0);
      setUpdateDismissed(false);
    });
    const unsubProgress = window.autoUpdater.onDownloadProgress((info) => {
      setDownloadProgress(info.percent);
    });
    const unsubDownloaded = window.autoUpdater.onUpdateDownloaded((info) => {
      setUpdateVersion(info.version);
      setUpdateReady(true);
      setDownloadProgress(null);
      setUpdateDismissed(false);
    });
    const unsubError = window.autoUpdater.onUpdateError(() => {
      setDownloadProgress(null);
    });

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleInstallUpdate = useCallback(() => {
    window.autoUpdater?.installUpdate();
  }, []);

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

      {/* Download progress bar */}
      {downloadProgress !== null && (
        <Snackbar open anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity="info" sx={{ width: "100%" }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {t("Update available").replace("{version}", updateVersion || "")}
            </Typography>
            <LinearProgress variant="determinate" value={downloadProgress} />
          </Alert>
        </Snackbar>
      )}

      {/* Update ready notification */}
      <Snackbar
        open={updateReady && !updateDismissed}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          sx={{ width: "100%" }}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button color="inherit" size="small" onClick={() => setUpdateDismissed(true)}>
                {t("Later")}
              </Button>
              <Button color="inherit" size="small" variant="outlined" onClick={handleInstallUpdate}>
                {t("Restart now")}
              </Button>
            </Box>
          }
        >
          {t("Update ready").replace("{version}", updateVersion || "")}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
