import { sprites } from "../../assets/sprites";
import { useEditingTarget } from "../../hooks/useEditingTarget";
import usePatchStore from "../../store";
import { Sprite, SpriteJson, Target } from "../EditorPane/types";
import React from "react";

export const changeSpriteValues = (eventSource: Target | null = null, setEditingTargetAttributes: (x: number, y: number, size: number, direction: number) => void, editingTargetId: string) => {
    // only update the attributes if the active sprite has changes
    if (eventSource) {
      if (eventSource.id !== editingTargetId) {
        return;
      }
    }

    const [editingTarget] = useEditingTarget();

    if (editingTarget) {
      setEditingTargetAttributes(editingTarget.x, editingTarget.y, editingTarget.size, editingTarget.direction)
    }

  }


export const useAddSprite = () => {
  const patchVM = usePatchStore((state) => state.patchVM);
  const setTargetIds = usePatchStore((state) => state.setTargetIds);
  const setEditingTargetAttributes = usePatchStore((state) => state.setEditingTargetAttributes);
  const saveTargetThreads = usePatchStore((state) => state.saveTargetThreads);
  const [editingTarget, setEditingTarget] = useEditingTarget();


  const addSprite = async (sprite: Sprite | SpriteJson) => {
    await patchVM.addSprite(sprite);
    const targets: Target[] = patchVM.getAllRenderedTargets();
    const newTarget = targets[targets.length - 1];

    setTargetIds(targets.map(target => target.id));
    setEditingTarget(newTarget.id);

    newTarget.on('EVENT_TARGET_VISUAL_CHANGE', (eventSource: Target | null) => changeSpriteValues(eventSource, setEditingTargetAttributes, editingTarget?.id ?? ""));
    return newTarget;
  }

  const handleUploadedSprite = (newTargetId: string) => {
    const newTarget = patchVM.runtime.getTargetById(newTargetId);
    newTarget.deleteCostume(0);
  }

  const onAddSprite = async (sprite?: Sprite | SpriteJson) => {
    if (editingTarget) {
      saveTargetThreads(editingTarget);
    }
    const validatedSprite = sprite ? sprite : sprites[0];
    const newTarget = await addSprite(validatedSprite);
    return newTarget?.id;
  }

  // New function to set code for a Snapbot sprite
  const setSnapbotSpriteCode = async (targetId: string, code: string) => {
    console.log(`Setting code for sprite ${targetId}: ${code}`);
    
    const target = patchVM.runtime.getTargetById(targetId);
    if (!target) {
      console.error("Target not found:", targetId);
      return;
    }
    
    // Get the codeEditorStore functions
    const codeEditorStore = usePatchStore.getState();
    
    // First, add a thread to the target using the codeEditorStore's addThread function
    // This is an async operation, so we need to wait for it to complete
    await codeEditorStore.addThread(target);
    
    // Now that the thread has been added, we can get its ID
    const threadIds = Object.keys(target.threads);
    const threadId = threadIds[threadIds.length - 1];
    
      if (!threadId) {
        console.error("Failed to create thread for target:", targetId);
        return;
      }
      
      console.log("Created thread with ID:", threadId);
      
      // Update the thread with the generated code
      codeEditorStore.updateThread(threadId, code);
      
      // Save the thread to ensure it's compiled
      codeEditorStore.saveThread(threadId);
      
      // Set this as the active thread
      codeEditorStore.setCodeThreadId(threadId);
      
      console.log("Thread updated with code:", code);
  }

  return {onAddSprite, handleUploadedSprite, setSnapbotSpriteCode};
}