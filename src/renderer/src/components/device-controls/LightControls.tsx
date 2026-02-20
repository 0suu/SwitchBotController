import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "../../useTranslation";
import { DeviceControlProps } from "./DeviceControls.types";
import { clamp, hexToRgbParameter, SectionLabel } from "./utils";
import { useDeviceType } from "../../hooks/useDeviceType";
import {
  COMMAND_SET_BRIGHTNESS,
  COMMAND_SET_COLOR,
  COMMAND_SET_COLOR_TEMPERATURE,
  COMMAND_TOGGLE,
  COMMAND_TURN_OFF,
  COMMAND_TURN_ON,
} from "../../constants/commandConstants";
import { AppDispatch, RootState } from "../../store/store";
import { selectIsTokenValidated } from "../../store/slices/settingsSlice";
import {
  executeScene,
  fetchScenes,
  selectNightLightSceneForDevice,
  selectSceneExecutionError,
  selectSceneIsExecuting,
  selectScenes,
  selectScenesError,
  selectScenesLoading,
  setNightLightSceneForDevice,
} from "../../store/slices/sceneSlice";

export const LightControls: React.FC<DeviceControlProps> = ({
  device,
  sendCommand,
  controlsDisabled,
  dense,
  showNightLightInstruction,
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const {
    isCeilingLight,
    supportsLightToggle,
    supportsLightBrightness,
    supportsLightColorTemperature,
    supportsLightColor,
  } = useDeviceType(device);

  const isTokenValid = useSelector(selectIsTokenValidated);

  const [brightness, setBrightness] = useState(80);
  const [colorTemp, setColorTemp] = useState(4000);
  const [color, setColor] = useState("#ffffff");

  // Night light scene logic
  const scenes = useSelector(selectScenes);
  const scenesLoading = useSelector(selectScenesLoading);
  const scenesError = useSelector(selectScenesError);
  const assignedNightLightSceneId = useSelector((state: RootState) =>
    selectNightLightSceneForDevice(state, device.deviceId)
  );
  const nightLightExecuting = useSelector((state: RootState) =>
    assignedNightLightSceneId
      ? selectSceneIsExecuting(state, assignedNightLightSceneId)
      : false
  );
  const nightLightExecutionError = useSelector((state: RootState) =>
    assignedNightLightSceneId
      ? selectSceneExecutionError(state, assignedNightLightSceneId)
      : null
  );

  const [nightLightSceneSelection, setNightLightSceneSelection] = useState<string>(
    assignedNightLightSceneId || ""
  );
  const [requestedScenes, setRequestedScenes] = useState(false);

  useEffect(() => {
    setNightLightSceneSelection(assignedNightLightSceneId || "");
  }, [assignedNightLightSceneId]);

  useEffect(() => {
    if (!isCeilingLight || !isTokenValid) return;
    if (scenes.length > 0 || scenesLoading || requestedScenes) return;
    setRequestedScenes(true);
    dispatch(fetchScenes());
  }, [
    dispatch,
    scenes.length,
    isCeilingLight,
    isTokenValid,
    requestedScenes,
    scenesLoading,
  ]);

  const nightLightScene = useMemo(
    () => scenes.find((scene) => scene.sceneId === assignedNightLightSceneId) || null,
    [assignedNightLightSceneId, scenes]
  );
  const hasScenes = scenes.length > 0;
  const nightLightSelectionChanged =
    nightLightSceneSelection !== (assignedNightLightSceneId || "");
  const nightLightButtonDisabled =
    controlsDisabled ||
    !isTokenValid ||
    !nightLightScene ||
    nightLightExecuting;
  const nightLightSaveDisabled =
    !isTokenValid ||
    scenesLoading ||
    (!hasScenes && !assignedNightLightSceneId && nightLightSceneSelection === "") ||
    !nightLightSelectionChanged;
  const nightLightInfoText = nightLightScene
    ? `${t("Assigned scene")}: ${nightLightScene.sceneName || t("Unnamed Scene")}`
    : showNightLightInstruction
    ? t("Assign a scene to enable the night light button.")
    : null;
  const nightLightInfoColor = nightLightScene ? "text.secondary" : "warning.main";

  const handleExecuteNightLightScene = () => {
    if (nightLightScene) {
      dispatch(executeScene(nightLightScene.sceneId));
    }
  };

  const handleSaveNightLightScene = () => {
    dispatch(
      setNightLightSceneForDevice({
        deviceId: device.deviceId,
        sceneId: nightLightSceneSelection || null,
      })
    );
  };

  const handleRefreshScenes = () => {
    setRequestedScenes(true);
    dispatch(fetchScenes());
  };

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
  const compactInputWidth = dense ? 220 : 260;

  return (
    <>
      <SectionLabel label="Lighting" dense={dense} />
      <Box sx={buttonGridSx}>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            if (isCeilingLight) {
              sendCommand(
                COMMAND_SET_BRIGHTNESS,
                Math.round(clamp(brightness, 1, 100))
              );
              return;
            }
            sendCommand(COMMAND_TURN_ON);
          }}
          disabled={controlsDisabled}
          fullWidth
        >
          {t("On")}
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => sendCommand(COMMAND_TURN_OFF)}
          disabled={controlsDisabled}
          fullWidth
        >
          {t("Off")}
        </Button>
        {supportsLightToggle && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => sendCommand(COMMAND_TOGGLE)}
            disabled={controlsDisabled}
            fullWidth
          >
            Toggle
          </Button>
        )}
        {isCeilingLight && (
          <Button
            size="small"
            variant="contained"
            onClick={handleExecuteNightLightScene}
            disabled={nightLightButtonDisabled}
            fullWidth
          >
            {nightLightExecuting ? t("Executing...") : t("Night Light")}
          </Button>
        )}
      </Box>
      {isCeilingLight && (
        <Stack spacing={0.25} sx={{ width: "100%", maxWidth: maxControlWidth }}>
          {nightLightInfoText && (
            <Typography variant="caption" color={nightLightInfoColor}>
              {nightLightInfoText}
            </Typography>
          )}
          {assignedNightLightSceneId && !nightLightScene && (
            <Typography variant="caption" color="error">
              {t("The assigned scene is not available. Refresh scenes or reassign.")}
            </Typography>
          )}
          {nightLightExecutionError && (
            <Typography variant="caption" color="error">
              {nightLightExecutionError}
            </Typography>
          )}
        </Stack>
      )}
      {supportsLightBrightness && (
        <Box sx={sliderContainerSx}>
          <Typography variant="caption" color="text.secondary">
            Brightness
          </Typography>
          <Slider
            size="small"
            value={brightness}
            min={1}
            max={100}
            onChange={(_, value) => setBrightness(value as number)}
            onChangeCommitted={(_, value) =>
              sendCommand(COMMAND_SET_BRIGHTNESS, Math.round(value as number))
            }
            valueLabelDisplay="auto"
            aria-label="Brightness"
            disabled={controlsDisabled}
          />
        </Box>
      )}
      {supportsLightColorTemperature && (
        <Box sx={sliderContainerSx}>
          <Typography variant="caption" color="text.secondary">
            Color temperature (2700-6500K)
          </Typography>
          <Slider
            size="small"
            value={colorTemp}
            min={2700}
            max={6500}
            step={100}
            onChange={(_, value) => setColorTemp(value as number)}
            onChangeCommitted={(_, value) =>
              sendCommand(
                COMMAND_SET_COLOR_TEMPERATURE,
                Math.round(value as number)
              )
            }
            valueLabelDisplay="auto"
            aria-label="Color temperature"
            disabled={controlsDisabled}
          />
        </Box>
      )}
      {supportsLightColor && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: "100%", maxWidth: maxControlWidth }}
        >
          <TextField
            label="Color (#RRGGBB)"
            size="small"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            sx={{ minWidth: 180, maxWidth: compactInputWidth }}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={controlsDisabled}
            onClick={() => {
              const rgb = hexToRgbParameter(color);
              if (rgb) sendCommand(COMMAND_SET_COLOR, rgb);
            }}
          >
            {t("Apply")}
          </Button>
        </Stack>
      )}
      {isCeilingLight && !dense && (
        <Stack spacing={0.75} sx={{ width: "100%", maxWidth: maxControlWidth }}>
          <SectionLabel label={t("Night light button settings")} dense={dense} />
          <TextField
            select
            size="small"
            label={t("Assign scene")}
            value={nightLightSceneSelection}
            onChange={(e) => setNightLightSceneSelection(e.target.value)}
            disabled={
              !isTokenValid ||
              scenesLoading ||
              (!hasScenes && !assignedNightLightSceneId)
            }
            helperText={
              hasScenes
                ? t("Select a scene to run when pressing the night light button.")
                : t("No scenes found. Create a manual scene in the SwitchBot app.")
            }
          >
            <MenuItem value="">{t("No scene assigned")}</MenuItem>
            {scenes.map((scene) => (
              <MenuItem key={scene.sceneId} value={scene.sceneId}>
                {scene.sceneName || t("Unnamed Scene")}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSaveNightLightScene}
              disabled={nightLightSaveDisabled}
            >
              {t("Save assignment")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefreshScenes}
              disabled={scenesLoading || !isTokenValid}
            >
              {scenesLoading ? t("Loading scenes...") : t("Reload scenes")}
            </Button>
          </Stack>
          {scenesError && (
            <Typography variant="caption" color="error">
              {scenesError}
            </Typography>
          )}
        </Stack>
      )}
    </>
  );
};
