import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import usePatchStore from "../../store";
import { create } from "zustand";

// Define a store for managing images per sprite
interface ImageDisplayState {
  // Structure: { [targetId]: { [imageKey: string]: base64Image } }
  spriteImages: { [targetId: string]: { [imageKey: string]: string } };
  currentImage: string | null;
  addImageToSprite: (targetId: string, imageKey: string, base64Image: string) => void;
  setCurrentImage: (targetId: string, imageKey: string) => void;
  getSpritesWithImages: () => string[];
  getSpriteImages: (targetId: string) => { [imageKey: string]: string } | null;
  getCurrentImage: () => string | null;
}

const useImageDisplayStore = create<ImageDisplayState>((set, get) => ({
  spriteImages: {},
  currentImage: null,
  addImageToSprite: (targetId, imageKey, base64Image) =>
    set((state) => ({
      spriteImages: {
        ...state.spriteImages,
        [targetId]: {
          ...(state.spriteImages[targetId] || {}),
          [imageKey]: base64Image,
        },
      },
    })),
  setCurrentImage: (targetId, imageKey) =>
    set((state) => {
      const spriteImagesMap = state.spriteImages[targetId] || {};
      return {
        currentImage: spriteImagesMap[imageKey] || null,
      };
    }),
  getSpritesWithImages: () => {
    return Object.keys(get().spriteImages);
  },
  getSpriteImages: (targetId) => {
    return get().spriteImages[targetId] || null;
  },
  getCurrentImage: () => {
    return get().currentImage;
  }
}));

interface ImageDisplayProps {
  imageKey?: string;
  targetId?: string;
  width?: string | number;
  height?: string | number;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageKey,
  targetId,
  width = 300,
  height = 300,
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
      }}
    >
      {currentImage ? (
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

// Export utility functions to add images from other components
export const addImageToSprite = (targetId: string, imageKey: string, base64Image: string) => {
  try {
    useImageDisplayStore.getState().addImageToSprite(targetId, imageKey, base64Image);
  } catch (error) {
    console.error('Error adding image to sprite:', error);
  }
};

export const setDisplayImage = (targetId: string, imageKey: string) => {
  try {
    useImageDisplayStore.getState().setCurrentImage(targetId, imageKey);
  } catch (error) {
    console.error('Error setting display image:', error);
  }
};

// Legacy support for old API
export const addImageToDisplay = (key: string, base64Image: string) => {
  // Get the current editing target id
  const vm = usePatchStore.getState().patchVM;
  const targetId = vm && vm.editingTarget ? vm.editingTarget.id : 'default';
  addImageToSprite(targetId, key, base64Image);
}; 