import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import usePatchStore from "../../store";
import { useImageDisplayStore, addImageToSprite as addImageToSpriteImpl, setCurrentImage as setCurrentImageImpl } from "./imageDisplayStore";

// Define interface for component props
interface ImageDisplayProps {
  imageKey?: string;
  targetId?: string;
  width?: string | number;
  height?: string | number;
  watchState?: boolean; // New prop to enable state watching
  className?: string;
  style?: React.CSSProperties;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageKey,
  targetId,
  width = 300,
  height = 300,
  watchState = false, // Default to false for backward compatibility
  className,
  style,
}) => {
  const { currentImage, spriteImages, setCurrentImage } = useImageDisplayStore();
  const patchVM = usePatchStore((state) => state.patchVM);
  const editingTarget = patchVM?.editingTarget || null;
  const editingTargetId = usePatchStore((state) => state.editingTargetId);
  
  // Use the provided targetId or fall back to the current editing target's id
  const currentTargetId = targetId || (editingTarget ? editingTarget.id : null);
  
  // Track component mounted state to avoid useEffect calls during unmount
  const [isMounted, setIsMounted] = useState(true);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Set the current image when the editing target or imageKey changes
  useEffect(() => {
    if (!isMounted) return;
    
    if (currentTargetId && spriteImages[currentTargetId]) {
      // If imageKey is provided, use it, otherwise use the first image for the sprite
      if (imageKey && spriteImages[currentTargetId][imageKey]) {
        setCurrentImage(currentTargetId, imageKey);
      } else {
        // Pick the first image for this sprite if one exists
        const firstImageKey = Object.keys(spriteImages[currentTargetId])[0];
        if (firstImageKey) {
          setCurrentImage(currentTargetId, firstImageKey);
        }
      }
    }
  }, [currentTargetId, imageKey, spriteImages, setCurrentImage, isMounted]);

  // Update when editing target changes (for automatic sprite selection)
  useEffect(() => {
    if (!isMounted) return;
    
    if (editingTargetId && !targetId && spriteImages[editingTargetId]) {
      // When editing target changes and no specific targetId is provided,
      // show the first available image for the new editing target
      const firstImageKey = Object.keys(spriteImages[editingTargetId])[0];
      if (firstImageKey) {
        setCurrentImage(editingTargetId, firstImageKey);
      }
    }
  }, [editingTargetId, targetId, spriteImages, setCurrentImage, isMounted]);

  return (
    <Box
      sx={{
        width,
        height,
        backgroundColor: "panel.main",
        borderRadius: "8px",
        padding: "8px",
        border: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style
      }}
      className={className}
    >
      {watchState ? (
        <StateWatchingImageDisplay targetId={currentTargetId} width={width} height={height} />
      ) : currentImage ? (
        <img
          src={currentImage}
          alt="Display"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          No image selected
        </Box>
      )}
    </Box>
  );
};

// New component that watches for state changes and updates displayed image
const StateWatchingImageDisplay: React.FC<{
  targetId: string | null;
  width?: string | number;
  height?: string | number;
}> = ({ targetId, width, height }) => {
  const spriteImages = useImageDisplayStore((state: any) => state.spriteImages);
  const [currentStateImage, setCurrentStateImage] = useState<string | null>(null);
  
  // Get global variables to watch for state changes
  const globalVariables = usePatchStore((state) => state.globalVariables);
  
  useEffect(() => {
    if (!targetId) return;
    
    // Find the state variable for this target
    const strippedTargetId = targetId.replace(/[^a-zA-Z0-9]/g, '');
    const stateVarName = `curr_state_${strippedTargetId}`;
    
    // Find the current state value
    const stateVar = globalVariables.find(v => v.name === stateVarName);
    if (!stateVar) return;
    
    const currentState = String(stateVar.value);
    
    // Get the image for the current state
    const targetImages = spriteImages[targetId] || {};
    const stateImage = targetImages[currentState] || null;
    
    if (stateImage) {
      setCurrentStateImage(stateImage);
    }
  }, [targetId, globalVariables, spriteImages]);
  
  if (currentStateImage) {
    return (
      <img
        src={currentStateImage}
        alt="State Display"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
    );
  }
  
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
      }}
    >
      No state image available
    </Box>
  );
};

// Export utility functions to add images from other components
export const addImageToSprite = (targetId: string, imageKey: string, base64Image: string) => {
  addImageToSpriteImpl(targetId, imageKey, base64Image);
};

export const setDisplayImage = (targetId: string, imageKey: string) => {
  setCurrentImageImpl(targetId, imageKey);
};

// Legacy support for old API
export const addImageToDisplay = (key: string, base64Image: string) => {
  // Get the current editing target id
  const vm = usePatchStore.getState().patchVM;
  const targetId = vm && vm.editingTarget ? vm.editingTarget.id : 'default';
  addImageToSprite(targetId, key, base64Image);
}; 