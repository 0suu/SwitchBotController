import React, { useState } from "react";
import { Box, Button, MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { SectionLabel, clamp } from "./utils";
import { useDeviceType } from "../../hooks/useDeviceType";
import { CustomCommandControls } from "./CustomCommandControls";

export const InfraredRemoteControls: React.FC<DeviceControlProps> = (props) => {
  const { device, sendCommand, controlsDisabled, dense, showCustomCommands } = props;
  const { t } = useTranslation();
  const {
    remoteTypeLabel,
    remoteSupportsDefaultCommands,
    isRemoteAC,
    isRemoteTV,
    isRemoteSpeaker,
    isRemoteFan,
    isRemoteLight,
  } = useDeviceType(device);

  const [acTemperature, setAcTemperature] = useState(26);
  const [acMode, setAcMode] = useState("2"); // 2: cool (per docs)
  const [acFanSpeed, setAcFanSpeed] = useState("3"); // 3: medium
  const [acPower, setAcPower] = useState<"on" | "off">("on");
  const [tvChannel, setTvChannel] = useState("");

  const gridColumns = dense ? 2 : 3;
  const maxControlWidth = dense ? 360 : 520;
  const buttonGridSx = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
    gap: dense ? 0.5 : 1,
    width: "100%",
    maxWidth: maxControlWidth,
  };
  const sliderContainerSx = { width: "100%", maxWidth: maxControlWidth };

  return (
    <>
      <SectionLabel
        label={
          <>
            {t("Virtual Remote")} - {remoteTypeLabel || t("Infrared device")}
          </>
        }
        dense={dense}
      />

      {remoteSupportsDefaultCommands && (
        <Box sx={buttonGridSx}>
          <Button
            size="small"
            variant="contained"
            onClick={() => sendCommand("turnOn")}
            disabled={controlsDisabled}
            fullWidth
          >
            {t("On")}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={() => sendCommand("turnOff")}
            disabled={controlsDisabled}
            fullWidth
          >
            {t("Off")}
          </Button>
        </Box>
      )}

      {isRemoteAC && (
        <>
          <Box sx={sliderContainerSx}>
            <Typography variant="caption" color="text.secondary">
              {t("Temperature (°C)")}
            </Typography>
            <Slider
              size="small"
              value={acTemperature}
              min={16}
              max={32}
              step={1}
              onChange={(_, v) => setAcTemperature(v as number)}
              valueLabelDisplay="auto"
              aria-label="AC temperature"
              disabled={controlsDisabled}
            />
          </Box>
          <Box sx={{ ...buttonGridSx, alignItems: "center" }}>
            <TextField
              select
              size="small"
              label={t("Mode")}
              value={acMode}
              onChange={(e) => setAcMode(e.target.value)}
              fullWidth
            >
              <MenuItem value="1">{t("Auto")}</MenuItem>
              <MenuItem value="2">{t("Cool")}</MenuItem>
              <MenuItem value="3">{t("Dry")}</MenuItem>
              <MenuItem value="4">{t("Fan")}</MenuItem>
              <MenuItem value="5">{t("Heat")}</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label={t("Fan speed")}
              value={acFanSpeed}
              onChange={(e) => setAcFanSpeed(e.target.value)}
              fullWidth
            >
              <MenuItem value="1">{t("Auto")}</MenuItem>
              <MenuItem value="2">{t("Low")}</MenuItem>
              <MenuItem value="3">{t("Medium")}</MenuItem>
              <MenuItem value="4">{t("High")}</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label={t("Power")}
              value={acPower}
              onChange={(e) => setAcPower(e.target.value as "on" | "off")}
              fullWidth
            >
              <MenuItem value="on">{t("On")}</MenuItem>
              <MenuItem value="off">{t("Off")}</MenuItem>
            </TextField>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              sendCommand(
                "setAll",
                `${acTemperature},${acMode},${acFanSpeed},${acPower}`
              )
            }
            disabled={controlsDisabled}
            fullWidth
            sx={{ alignSelf: "flex-start", maxWidth: maxControlWidth }}
          >
            {t("Send setAll")}
          </Button>
        </>
      )}

      {isRemoteTV && (
        <>
          <Box sx={buttonGridSx}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => sendCommand("volumeAdd")}
              disabled={controlsDisabled}
              fullWidth
            >
              Volume +
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => sendCommand("volumeSub")}
              disabled={controlsDisabled}
              fullWidth
            >
              Volume -
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => sendCommand("channelAdd")}
              disabled={controlsDisabled}
              fullWidth
            >
              Channel +
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => sendCommand("channelSub")}
              disabled={controlsDisabled}
              fullWidth
            >
              Channel -
            </Button>
          </Box>
          <Stack
            spacing={0.5}
            sx={{ width: "100%", maxWidth: maxControlWidth }}
          >
            <TextField
              label="Channel number"
              size="small"
              value={tvChannel}
              onChange={(e) => setTvChannel(e.target.value)}
              placeholder="e.g. 15"
            />
            <Button
              size="small"
              variant="outlined"
              disabled={controlsDisabled || !tvChannel}
              onClick={() => sendCommand("SetChannel", tvChannel)}
              sx={{ alignSelf: "flex-start" }}
            >
              Set channel
            </Button>
          </Stack>
        </>
      )}

      {isRemoteSpeaker && (
        <Box sx={buttonGridSx}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("setMute")}
            disabled={controlsDisabled}
            fullWidth
          >
            Mute
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("Play")}
            disabled={controlsDisabled}
            fullWidth
          >
            Play
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("Pause")}
            disabled={controlsDisabled}
            fullWidth
          >
            Pause
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("Stop")}
            disabled={controlsDisabled}
            fullWidth
          >
            Stop
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("Next")}
            disabled={controlsDisabled}
            fullWidth
          >
            Next
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("Previous")}
            disabled={controlsDisabled}
            fullWidth
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("FastForward")}
            disabled={controlsDisabled}
            fullWidth
          >
            Fast Forward
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("Rewind")}
            disabled={controlsDisabled}
            fullWidth
          >
            Rewind
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("volumeAdd")}
            disabled={controlsDisabled}
            fullWidth
          >
            Volume +
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("volumeSub")}
            disabled={controlsDisabled}
            fullWidth
          >
            Volume -
          </Button>
        </Box>
      )}

      {isRemoteFan && (
        <Box sx={buttonGridSx}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("swing")}
            disabled={controlsDisabled}
            fullWidth
          >
            Swing
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("timer")}
            disabled={controlsDisabled}
            fullWidth
          >
            Timer
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("lowSpeed")}
            disabled={controlsDisabled}
            fullWidth
          >
            Low
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("middleSpeed")}
            disabled={controlsDisabled}
            fullWidth
          >
            Medium
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("highSpeed")}
            disabled={controlsDisabled}
            fullWidth
          >
            High
          </Button>
        </Box>
      )}

      {isRemoteLight && (
        <Box sx={buttonGridSx}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("brightnessUp")}
            disabled={controlsDisabled}
            fullWidth
          >
            Brightness +
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand("brightnessDown")}
            disabled={controlsDisabled}
            fullWidth
          >
            Brightness -
          </Button>
        </Box>
      )}

      {showCustomCommands && <CustomCommandControls {...props} />}
    </>
  );
};
