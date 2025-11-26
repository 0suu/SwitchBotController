import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  selectSceneOrder,
  setSceneOrder,
} from "../store/slices/sceneSlice";
import { SceneSummary } from "../../../api/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
    },
  },
};

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
  const sceneOrder = useSelector(selectSceneOrder);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { pressDelay: 150, pressThreshold: 5 })
  );

  const orderedScenes: SceneSummary[] = useMemo(() => {
    const idToScene = new Map<string, SceneSummary>();
    scenes.forEach((scene) => idToScene.set(scene.sceneId, scene));
    const seen = new Set<string>();
    const ordered: SceneSummary[] = [];

    sceneOrder.forEach((id) => {
      const scene = idToScene.get(id);
      if (scene && !seen.has(id)) {
        ordered.push(scene);
        seen.add(id);
      }
    });

    scenes.forEach((scene) => {
      if (!seen.has(scene.sceneId)) {
        ordered.push(scene);
      }
    });

    return ordered;
  }, [scenes, sceneOrder]);

  const sceneMap = useMemo(() => {
    const map = new Map<string, SceneSummary>();
    orderedScenes.forEach((scene) => map.set(scene.sceneId, scene));
    return map;
  }, [orderedScenes]);

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

  useEffect(() => {
    if (isReorderMode && orderedScenes.length === 0) {
      setIsReorderMode(false);
      setReorderList([]);
    }
  }, [orderedScenes.length, isReorderMode]);

  useEffect(() => {
    if (!isReorderMode) return;
    const visibleIds = orderedScenes.map((scene) => scene.sceneId);
    setReorderList((prev) => {
      const next = prev.filter((id) => visibleIds.includes(id));
      visibleIds.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    });
  }, [orderedScenes, isReorderMode]);

  useEffect(() => {
    if (!draggingId) return;

    const handleWheel = (e: WheelEvent) => {
      window.scrollBy(0, e.deltaY);
    };

    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [draggingId]);

  const moveIdInList = (list: string[], fromId: string, toId: string) => {
    if (fromId === toId) return list;
    const fromIndex = list.indexOf(fromId);
    const toIndex = list.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return list;
    const next = [...list];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, fromId);
    return next;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!isReorderMode) return;
    setDraggingId(String(event.active.id));
    setDragOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!isReorderMode) return;
    const overId = event.over?.id;
    if (!overId || !draggingId || draggingId === overId) return;
    setDragOverId(String(overId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isReorderMode) return;
    const { active, over } = event;
    if (active?.id && over?.id) {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId !== overId) {
        setReorderList((prev) => moveIdInList(prev, activeId, overId));
      }
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragCancel = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const startReorder = () => {
    setReorderList(orderedScenes.map((scene) => scene.sceneId));
    setIsReorderMode(true);
  };

  const finishReorder = () => {
    const currentOrder = orderedScenes.map((scene) => scene.sceneId);
    const mergedOrder =
      reorderList.length > 0
        ? [...reorderList, ...currentOrder.filter((id) => !reorderList.includes(id))]
        : currentOrder;
    dispatch(setSceneOrder(mergedOrder));
    setIsReorderMode(false);
  };

  const toggleReorderMode = () => {
    if (isReorderMode) {
      finishReorder();
    } else {
      startReorder();
    }
  };

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
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant={isReorderMode ? "contained" : "outlined"}
            color="primary"
            startIcon={<SwapVertIcon />}
            onClick={toggleReorderMode}
            disabled={orderedScenes.length === 0 || isLoading}
            sx={{ px: 2.5, py: 1 }}
          >
            {isReorderMode ? t("Done") : t("Reorder")}
          </Button>
          <Button
            variant="contained"
            onClick={handleRefresh}
            disabled={isLoading || !isTokenValid}
            sx={{ px: 3, py: 1 }}
          >
            {t("Refresh")}
          </Button>
        </Box>
      </Box>

      {!isTokenValid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("API credentials are set but not validated. Please test them in Settings.")}
        </Alert>
      )}

      {isReorderMode && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Drag cards by the handle to reorder. Press Done to save.")}
        </Typography>
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
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={
                isReorderMode
                  ? reorderList
                  : orderedScenes.map((scene) => scene.sceneId)
              }
              strategy={rectSortingStrategy}
            >
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, 160px)",
                    gap: 1.5,
                    justifyContent: "center",
                  }}
                >
                  <AnimatePresence>
                    {(isReorderMode
                      ? reorderList
                          .map((sceneId) => sceneMap.get(sceneId))
                          .filter((scene): scene is SceneSummary => !!scene)
                      : orderedScenes
                    ).map((scene) => (
                      <motion.div key={scene.sceneId} variants={itemVariants} layout>
                        <SortableSceneCard
                          scene={scene}
                          isReorderMode={isReorderMode}
                          draggingId={draggingId}
                          dragOverId={dragOverId}
                          isTokenValid={isTokenValid}
                          executingById={executingById}
                          executionErrorById={executionErrorById}
                          t={t}
                          onExecute={handleExecute}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Box>
              </motion.div>
            </SortableContext>
          </DndContext>
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

type SortableSceneCardProps = {
  scene: SceneSummary;
  isReorderMode: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  isTokenValid: boolean;
  executingById: Record<string, boolean>;
  executionErrorById: Record<string, string | undefined>;
  t: (key: string) => string;
  onExecute: (sceneId: string) => void;
};

const SortableSceneCard: React.FC<SortableSceneCardProps> = ({
  scene,
  isReorderMode,
  draggingId,
  dragOverId,
  isTokenValid,
  executingById,
  executionErrorById,
  t,
  onExecute,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: scene.sceneId,
    disabled: !isReorderMode,
  });
  const isExecuting = !!executingById[scene.sceneId];
  const sceneError = executionErrorById[scene.sceneId];

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: "relative",
        opacity: isDragging || draggingId === scene.sceneId ? 0.5 : 1,
        transition: "opacity 0.2s ease",
        outline: dragOverId === scene.sceneId || isOver ? "2px solid" : "none",
        outlineColor: "primary.main",
        outlineOffset: "2px",
        borderRadius: 2,
      }}
      style={style}
      {...attributes}
      {...listeners}
    >
      {isReorderMode && (
        <IconButton
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "background.paper",
            boxShadow: 1,
            pointerEvents: "none",
          }}
          aria-label={"Reorder"}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      )}
      <Button
        variant="contained"
        onClick={() => onExecute(scene.sceneId)}
        disabled={!isTokenValid || isExecuting || isReorderMode}
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
            <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
              {t("Executing...")}
            </Typography>
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
              fontSize: "0.85rem",
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
    </Box>
  );
};
