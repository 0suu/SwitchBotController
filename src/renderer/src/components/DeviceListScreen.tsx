
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
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
  setDeviceOrder,
  selectDeviceOrder,
} from "../store/slices/deviceSlice";
import { selectIsTokenValidated, selectApiToken } from "../store/slices/settingsSlice";
import { DeviceCard } from "./DeviceCard";
import { shouldHideDevice } from "../deviceDefinitions";
import { useTranslation } from "../useTranslation";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { AnyDevice } from "../../../api/types";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const deviceOrder = useSelector(selectDeviceOrder);
  const isLoading = useSelector(selectDevicesLoading);
  const error = useSelector(selectDevicesError);
  const isTokenValid = useSelector(selectIsTokenValidated);
  const apiTokenSet = useSelector(selectApiToken);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const orderedDevices = useMemo(() => {
    const idToDevice = new Map<string, AnyDevice>();
    devices.forEach((device) => {
      idToDevice.set(device.deviceId, device);
    });
    const seen = new Set<string>();
    const ordered: AnyDevice[] = [];

    deviceOrder.forEach((id) => {
      const device = idToDevice.get(id);
      if (device && !seen.has(id)) {
        ordered.push(device);
        seen.add(id);
      }
    });

    devices.forEach((device) => {
      if (!seen.has(device.deviceId)) {
        ordered.push(device);
      }
    });

    return ordered;
  }, [devices, deviceOrder]);

  const filteredDevices = useMemo(
    () => orderedDevices.filter((device) => !shouldHideDevice(device.deviceType)),
    [orderedDevices]
  );

  const filteredDeviceMap = useMemo(() => {
    const map = new Map<string, AnyDevice>();
    filteredDevices.forEach((device) => map.set(device.deviceId, device));
    return map;
  }, [filteredDevices]);

  const gridSx = useMemo(
    () => ({
      display: "grid",
      gap: 3,
      gridTemplateColumns: {
        xs: "repeat(1, minmax(0, 1fr))",
        sm: "repeat(2, minmax(0, 1fr))",
        md: "repeat(3, minmax(0, 1fr))",
        lg: "repeat(4, minmax(0, 1fr))",
      },
    }),
    []
  );

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

  useEffect(() => {
    if (isReorderMode && filteredDevices.length === 0) {
      setIsReorderMode(false);
      setReorderList([]);
    }
  }, [filteredDevices.length, isReorderMode]);

  // Keep the reorder list in sync if devices are added/removed during reorder mode.
  useEffect(() => {
    if (!isReorderMode) return;
    const visibleIds = filteredDevices.map((device) => device.deviceId);
    setReorderList((prev) => {
      const next = prev.filter((id) => visibleIds.includes(id));
      visibleIds.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    });
  }, [filteredDevices, isReorderMode]);

  // ドラッグ中でもホイールスクロールできるようにする
  useEffect(() => {
    if (!draggingId) return;

    const handleWheel = (e: WheelEvent) => {
      window.scrollBy(0, e.deltaY);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [draggingId]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
    setDragOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (!overId) return;
    setDragOverId(overId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setReorderList((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = [...prev];
        next.splice(oldIndex, 1);
        next.splice(newIndex, 0, active.id as string);
        return next;
      });
    }

    setDraggingId(null);
    setDragOverId(null);
  };

  const startReorder = () => {
    setReorderList(filteredDevices.map((device) => device.deviceId));
    setIsReorderMode(true);
  };

  const finishReorder = () => {
    const currentOrder = devices.map((device) => device.deviceId);
    const mergedOrder =
      reorderList.length > 0
        ? [...reorderList, ...currentOrder.filter((id) => !reorderList.includes(id))]
        : currentOrder;
    dispatch(setDeviceOrder(mergedOrder));
    setIsReorderMode(false);
  };

  const toggleReorderMode = () => {
    if (isReorderMode) {
      finishReorder();
    } else {
      startReorder();
    }
  };

  const sortableItems = isReorderMode
    ? reorderList.map((deviceId) => filteredDeviceMap.get(deviceId)).filter((device): device is AnyDevice => !!device)
    : filteredDevices;

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
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant={isReorderMode ? "contained" : "outlined"}
            color="primary"
            startIcon={<SwapVertIcon />}
            onClick={toggleReorderMode}
            disabled={filteredDevices.length === 0 || isLoading}
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

      {isReorderMode && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Drag cards by the handle to reorder. Press Done to save.")}
        </Typography>
      )}

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

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={isReorderMode ? handleDragStart : undefined}
          onDragOver={isReorderMode ? handleDragOver : undefined}
          onDragEnd={isReorderMode ? handleDragEnd : undefined}
        >
          <SortableContext
            items={sortableItems.map((device) => device.deviceId)}
            strategy={rectSortingStrategy}
          >
            <Box sx={gridSx}>
              <AnimatePresence>
                {sortableItems.map((device) => (
                  <motion.div variants={itemVariants} layout key={device.deviceId}>
                    <SortableDeviceCard
                      device={device}
                      status={statusMap[device.deviceId]}
                      onSelect={onDeviceSelect}
                      isReorderMode={isReorderMode}
                      isDragging={draggingId === device.deviceId}
                      isOver={dragOverId === device.deviceId}
                      translationDisabled={!isReorderMode}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>
          </SortableContext>
        </DndContext>
      </motion.div>
    </Container>
  );
};

const SortableDeviceCard: React.FC<{
  device: AnyDevice;
  status?: Record<string, any>;
  onSelect: (deviceId: string) => void;
  isReorderMode: boolean;
  isDragging: boolean;
  isOver: boolean;
  translationDisabled: boolean;
}> = ({ device, status, onSelect, isReorderMode, isDragging, isOver, translationDisabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id: device.deviceId });

  const style = {
    transform: translationDisabled ? undefined : CSS.Transform.toString(transform),
    transition: translationDisabled ? undefined : transition,
  };

  return (
    <Box ref={setNodeRef} style={style} {...(isReorderMode ? { ...attributes, ...listeners } : {})}>
      <Box
        sx={{
          position: "relative",
          opacity: isDragging || isSorting ? 0.5 : 1,
          transition: "opacity 0.2s ease",
          outline: isOver ? "2px solid" : "none",
          outlineColor: "primary.main",
          outlineOffset: "2px",
          borderRadius: 2,
          cursor: isReorderMode ? "grab" : "default",
        }}
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
            aria-label="並び替え"
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        )}
        <DeviceCard device={device} status={status} onSelect={onSelect} />
      </Box>
    </Box>
  );
};
