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

export const useImageDisplayStore = create<ImageDisplayState>((set, get) => {
  // Create store implementation
  const store = {
    spriteImages: {},
    currentImage: null,
    addImageToSprite: (targetId: string, imageKey: string, base64Image: string) =>
      set((state: ImageDisplayState) => ({
        spriteImages: {
          ...state.spriteImages,
          [targetId]: {
            ...(state.spriteImages[targetId] || {}),
            [imageKey]: base64Image,
          },
        },
      })),
    setCurrentImage: (targetId: string, imageKey: string) =>
      set((state: ImageDisplayState) => {
        const spriteImagesMap = state.spriteImages[targetId] || {};
        return {
          currentImage: spriteImagesMap[imageKey] || null,
        };
      }),
    getSpritesWithImages: () => {
      return Object.keys(get().spriteImages);
    },
    getSpriteImages: (targetId: string) => {
      return get().spriteImages[targetId] || null;
    },
    getCurrentImage: () => {
      return get().currentImage;
    }
  };

  // Make the store accessible globally for components that need to access it
  if (typeof window !== 'undefined') {
    (window as any).ImageDisplayStoreState = store;
  }

  return store;
});

// Export accessor functions to be used by components
export const getSpritesWithImages = () => {
  return useImageDisplayStore.getState().getSpritesWithImages();
};

export const getSpriteImages = (targetId: string) => {
  return useImageDisplayStore.getState().getSpriteImages(targetId);
};

export const getCurrentImage = () => {
  return useImageDisplayStore.getState().getCurrentImage();
};

export const addImageToSprite = (targetId: string, imageKey: string, base64Image: string) => {
  useImageDisplayStore.getState().addImageToSprite(targetId, imageKey, base64Image);
};

export const setCurrentImage = (targetId: string, imageKey: string) => {
  useImageDisplayStore.getState().setCurrentImage(targetId, imageKey);
}; 