import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

import { AppDispatch, RootState } from "../store/store";
import { useTranslation } from "../useTranslation";
import { selectApiToken, selectIsTokenValidated } from "../store/slices/settingsSlice";
import {
  fetchScenes,
  executeScene,
  selectScenes,
  selectScenesLoading,
  selectScenesError,
  selectLastExecutedSceneId,
  clearScenesState,
} from "../store/slices/sceneSlice";

export const ScenesScreen: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const scenes = useSelector(selectScenes);
  const isLoading = useSelector(selectScenesLoading);
  const error = useSelector(selectScenesError);
  const isTokenValid = useSelector(selectIsTokenValidated);
  const apiToken = useSelector(selectApiToken);
  const lastExecutedSceneId = useSelector(selectLastExecutedSceneId);
  const executingById = useSelector((state: RootState) => state.scenes.executingById);
  const executionErrorById = useSelector((state: RootState) => state.scenes.executionErrorById);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (isTokenValid && apiToken) {
      dispatch(fetchScenes());
    } else {
      dispatch(clearScenesState());
    }
  }, [dispatch, isTokenValid, apiToken]);

  useEffect(() => {
    if (lastExecutedSceneId) {
      setSuccessOpen(true);
    }
  }, [lastExecutedSceneId]);

  const handleRefresh = () => {
    if (isTokenValid && apiToken) {
      dispatch(fetchScenes());
    }
  };

  const handleExecute = (sceneId: string) => {
    dispatch(executeScene(sceneId));
  };

  const handleSuccessClose = () => setSuccessOpen(false);

  if (!apiToken) {
    return (
      <Container sx={{ mt: 2 }}>
        <Alert severity="warning">
          {t("API Token not set. Please configure your API credentials in the Settings screen.")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" gutterBottom component="div">
          {t("Scenes")}
        </Typography>
        <Button variant="outlined" onClick={handleRefresh} disabled={isLoading || !isTokenValid}>
          {t("Refresh")}
        </Button>
      </Box>

      {!isTokenValid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("API credentials are set but not validated. Please test them in Settings.")}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(error)}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>{t("Loading scenes...")}</Typography>
        </Box>
      ) : (
        <>
          {!error && isTokenValid && scenes.length === 0 && (
            <Alert severity="info">{t("No scenes found. Create a manual scene in the SwitchBot app.")}</Alert>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, 160px)",
              gap: 1.5,
              justifyContent: "center",
            }}
          >
            {scenes.map((scene) => {
              const isExecuting = !!executingById[scene.sceneId];
              const sceneError = executionErrorById[scene.sceneId];
              return (
                <Button
                  key={scene.sceneId}
                  variant="contained"
                  onClick={() => handleExecute(scene.sceneId)}
                  disabled={!isTokenValid || isExecuting}
                  sx={{
                    position: "relative",
                    height: 50,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1,
                    borderRadius: 2,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover:not(:disabled)": {
                      transform: "translateY(-2px)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 4px 12px rgba(100, 181, 246, 0.25)"
                          : "0 4px 12px rgba(25, 118, 210, 0.25)",
                    },
                  }}
                >
                  {isExecuting ? (
                    <>
                      <CircularProgress size={16} sx={{ color: "inherit", mb: 0.5 }} />
                      <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>{t("Executing...")}</Typography>
                    </>
                  ) : (
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      noWrap
                      sx={{
                        textAlign: "center",
                        width: "100%",
                        px: 0.5,
                        fontSize: "0.85rem"
                      }}
                    >
                      {scene.sceneName || t("Unnamed Scene")}
                    </Typography>
                  )}
                  {sceneError && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        px: 1,
                      }}
                    >
                      Error
                    </Typography>
                  )}
                </Button>
              );
            })}
          </Box>
        </>
      )}

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={handleSuccessClose} sx={{ width: "100%" }}>
          {t("Scene executed successfully.")}
        </Alert>
      </Snackbar>
    </Container>
  );
};
