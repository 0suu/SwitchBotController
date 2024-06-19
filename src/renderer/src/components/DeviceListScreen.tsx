
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid"; // Using Grid for compatibility
import { motion, AnimatePresence } from "framer-motion";

import { AppDispatch } from "../store/store";
import {
  fetchDevices,
  selectAllDevices,
  selectDevicesLoading,
  selectDevicesError,
  clearDevices,
  setError,
  selectDeviceStatusMap,
} from "../store/slices/deviceSlice";
import { selectIsTokenValidated, selectApiToken } from "../store/slices/settingsSlice";
import { DeviceCard } from "./DeviceCard";
import { shouldHideDevice } from "../deviceDefinitions";
import { useTranslation } from "../useTranslation";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20
    }
  }
};

export const DeviceListScreen: React.FC<{ onDeviceSelect: (deviceId: string) => void }> = ({ onDeviceSelect }) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const devices = useSelector(selectAllDevices);
  const statusMap = useSelector(selectDeviceStatusMap);
  const isLoading = useSelector(selectDevicesLoading);
  const error = useSelector(selectDevicesError);
  const isTokenValid = useSelector(selectIsTokenValidated);
  const apiTokenSet = useSelector(selectApiToken);

  useEffect(() => {
    if (isTokenValid && apiTokenSet) {
      dispatch(fetchDevices());
    } else if (apiTokenSet && !isTokenValid) {
      dispatch(clearDevices());
      dispatch(setError(t("API credentials are set but not validated. Please test them in Settings.")));
    } else {
      dispatch(clearDevices());
      dispatch(setError(t("API credentials not configured. Please go to Settings.")));
    }
  }, [dispatch, isTokenValid, apiTokenSet, t]);

  const handleRefresh = () => {
    if (isTokenValid && apiTokenSet) {
      dispatch(fetchDevices());
    } else {
      dispatch(setError(t("Cannot refresh. API credentials are not valid or not set.")));
    }
  };

  if (!apiTokenSet) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning" variant="filled">
          {t("API Token not set. Please configure your API credentials in the Settings screen.")}
        </Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3, color: "text.secondary" }}>{t("Loading devices...")}</Typography>
      </Box>
    );
  }

  const filteredDevices = devices.filter((device) => !shouldHideDevice(device.deviceType));

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {t("Device List")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("Manage and control your SwitchBot devices")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleRefresh}
          disabled={isLoading || !isTokenValid}
          sx={{ px: 3, py: 1 }}
        >
          {t("Refresh")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => dispatch(setError(null))}>
          {t(error)}
        </Alert>
      )}

      {!isLoading && !error && filteredDevices.length === 0 && isTokenValid && (
        <Box sx={{ textAlign: "center", py: 8, bgcolor: "background.paper", borderRadius: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {t("No devices found, or check API permissions.")}
          </Typography>
        </Box>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredDevices.map((device) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={device.deviceId}>
                <motion.div variants={itemVariants} layout>
                  <DeviceCard
                    device={device}
                    status={statusMap[device.deviceId]}
                    onSelect={onDeviceSelect}
                  />
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      </motion.div>
    </Container>
  );
};

