import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import MenuItem from "@mui/material/MenuItem";

import { AppDispatch } from "../store/store"; // Adjust path
import {
  loadApiCredentials,
  selectApiToken,
  selectApiSecret,
  selectIsTokenValidated,
  selectValidationMessage,
  selectPollingInterval,
  setPollingInterval,
  clearApiCredentials, // Added for a clear button
  validateAndSaveApiCredentials,
  setLanguage,
  selectLanguage,
  selectTheme,
  setTheme,
} from "../store/slices/settingsSlice"; // Adjust path
import { useTranslation } from "../useTranslation";

export const SettingsScreen: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();

  const storedToken = useSelector(selectApiToken);
  const storedSecret = useSelector(selectApiSecret);
  const isTokenCurrentlyValid = useSelector(selectIsTokenValidated);
  const validationMsg = useSelector(selectValidationMessage);
  const pollingInterval = useSelector(selectPollingInterval);
  const language = useSelector(selectLanguage);
  const themeSetting = useSelector(selectTheme);

  const [tokenInput, setTokenInput] = useState(storedToken || "");
  const [secretInput, setSecretInput] = useState(storedSecret || "");
  const [isLoading, setIsLoading] = useState(false);
  const [pollingInput, setPollingInput] = useState(pollingInterval);

  useEffect(() => {
    // Load credentials from store when component mounts
    dispatch(loadApiCredentials());
  }, [dispatch]);

  useEffect(() => {
    // Update local state if store changes (e.g. after loading)
    setTokenInput(storedToken || "");
    setSecretInput(storedSecret || "");
    setPollingInput(pollingInterval);
  }, [storedToken, storedSecret, pollingInterval]);

  const handleValidateAndSave = async () => {
    if (!tokenInput.trim() || !secretInput.trim()) {
      dispatch({ type: "settings/setValidationMessage", payload: t("Token and Secret cannot be empty.") });
      return;
    }
    setIsLoading(true);
    await dispatch(validateAndSaveApiCredentials({ token: tokenInput, secret: secretInput }));
    setIsLoading(false);
  };

  const handleClear = () => {
    dispatch(clearApiCredentials());
    setTokenInput("");
    setSecretInput("");
  };

  const handleSavePolling = () => {
    if (pollingInput < 0 || Number.isNaN(pollingInput)) return;
    dispatch(setPollingInterval(Math.max(0, Math.round(pollingInput))));
  };

  return (
    <Container sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        {t("Settings Title")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 640 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("SwitchBot Cloud Credentials")}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t(
              "Enter your SwitchBot Open Token and Secret Key so this app can access your devices via the official cloud API."
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t("On the SwitchBot mobile app instructions")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("Credentials storage note")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label={t("Open Token")}
              variant="outlined"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              fullWidth
              disabled={isLoading}
              autoComplete="off"
              helperText={t("Copy the Open Token from the SwitchBot mobile app and paste it here.")}
            />
            <TextField
              label={t("Secret Key")}
              variant="outlined"
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              fullWidth
              disabled={isLoading}
              autoComplete="off"
              helperText={t("Copy the Secret Key from the SwitchBot mobile app. Keep this value private.")}
            />
            {validationMsg && (
              <Alert
                severity={
                  isTokenCurrentlyValid
                    ? "success"
                    : validationMsg.startsWith("Error") || validationMsg.startsWith("Validation failed")
                    ? "error"
                    : "info"
                }
                sx={{ mt: 1 }}
              >
                {validationMsg}
              </Alert>
            )}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mt: 1 }}>
              <Button
                variant="contained"
                onClick={handleValidateAndSave}
                disabled={isLoading || !tokenInput || !secretInput}
              >
                {t("Validate and Save")}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleClear}
                disabled={isLoading}
              >
                {t("Clear Stored Credentials")}
              </Button>
              {isLoading && <CircularProgress size={24} sx={{ ml: 1 }} />}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t("Tip: The credentials you enter here will only be saved if validation succeeds.")}
            </Typography>
          </Box>
        </Paper>

        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("Polling Interval")}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("Polling description")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", maxWidth: 320, mt: 1 }}>
            <TextField
              label={t("Interval (sec)")}
              type="number"
              size="small"
              value={pollingInput}
              onChange={(e) => setPollingInput(Number(e.target.value))}
              inputProps={{ min: 0, step: 5 }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              disabled={pollingInput < 0 || Number.isNaN(pollingInput)}
              onClick={handleSavePolling}
            >
              {t("Save")}
            </Button>
          </Box>
        </Paper>

        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("Theme")}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("Select how the app theme is applied.")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
            <TextField
              select
              label={t("Theme")}
              size="small"
              value={themeSetting}
              onChange={(e) => dispatch(setTheme(e.target.value as "light" | "dark" | "system"))}
              sx={{ width: 220 }}
            >
              <MenuItem value="light">{t("Light Theme")}</MenuItem>
              <MenuItem value="dark">{t("Dark Theme")}</MenuItem>
              <MenuItem value="system">{t("Follow System")}</MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("Language")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
            <TextField
              select
              label={t("Language")}
              size="small"
              value={language}
              onChange={(e) => dispatch(setLanguage(e.target.value as "en" | "ja"))}
              sx={{ width: 200 }}
            >
              <MenuItem value="en">{t("English")}</MenuItem>
              <MenuItem value="ja">{t("Japanese")}</MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("App Info")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("App Version")}: {t("Footer Version")}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};
