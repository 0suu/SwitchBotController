import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";

import { AppDispatch, RootState } from "../store/store";
import {
  fetchDeviceStatus,
  selectSelectedDeviceStatus,
  selectSelectedDeviceIsLoading,
  selectSelectedDeviceError,
  clearSelectedDeviceStatus,
  selectDeviceByIdFromList,
  clearDeviceCommandError,
  setSelectedDeviceError,
} from "../store/slices/deviceSlice";
import { selectIsTokenValidated } from "../store/slices/settingsSlice";
import { DeviceControls } from "./DeviceControls";
import { useTranslation } from "../useTranslation";

interface DeviceDetailScreenProps {
  deviceId: string | null;
  onBack: () => void;
}

export const DeviceDetailScreen: React.FC<DeviceDetailScreenProps> = ({ deviceId, onBack }) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const deviceDetails = useSelector((state: RootState) => deviceId ? selectDeviceByIdFromList(state, deviceId) : null);
  const status = useSelector(selectSelectedDeviceStatus);
  const isLoadingStatus = useSelector(selectSelectedDeviceIsLoading);
  const statusError = useSelector(selectSelectedDeviceError);
  const isTokenValid = useSelector(selectIsTokenValidated);
  const isVirtualRemote = deviceDetails ? (deviceDetails as any).isInfraredRemote : false;

  useEffect(() => {
    if (deviceId && isTokenValid && !isVirtualRemote) {
      dispatch(fetchDeviceStatus(deviceId));
      dispatch(clearDeviceCommandError(deviceId));
    } else if (!isTokenValid && deviceId) {
      dispatch(setSelectedDeviceError({ deviceId, error: t("API Credentials not validated.") }));
    }
    return () => {
      dispatch(clearSelectedDeviceStatus());
      if (deviceId) dispatch(clearDeviceCommandError(deviceId));
    };
  }, [dispatch, deviceId, isTokenValid, isVirtualRemote, t]);

  const handleRefreshStatus = () => {
    if (deviceId && isTokenValid && !isVirtualRemote) dispatch(fetchDeviceStatus(deviceId));
  };

  if (!deviceId) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">{t("No device selected.")}</Alert>
        <Button onClick={onBack} sx={{ mt: 2 }} startIcon={<ArrowBackIcon />}>
          {t("Back to List")}
        </Button>
      </Container>
    );
  }
  const deviceName = deviceDetails?.deviceName || deviceId;

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {deviceName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {deviceId} | Type: {deviceDetails?.deviceType || "N/A"}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshStatus}
          disabled={isLoadingStatus || !isTokenValid || isVirtualRemote}
        >
          {t("Refresh Status")}
        </Button>
      </Box>

      {/* Command Panel */}
      {deviceDetails && isTokenValid && (
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t("Controls")}
          </Typography>
          <DeviceControls device={deviceDetails} status={status} showCustomCommands />
        </Paper>
      )}

      {/* Status Display */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        {t("Device Status")}
      </Typography>

      {isVirtualRemote && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("Status API is not available for virtual infrared remotes. Use the controls above to send commands.")}
        </Alert>
      )}

      {!isVirtualRemote && isLoadingStatus && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>{t("Loading status...")}</Typography>
        </Box>
      )}

      {!isVirtualRemote && statusError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("Error fetching status:")} {statusError}
        </Alert>
      )}

      {!isVirtualRemote && !isLoadingStatus && !statusError && status && (
        <Grid container spacing={2}>
          {Object.entries(status).map(([key, value]) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
              <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
                    {key}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {String(value)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};
