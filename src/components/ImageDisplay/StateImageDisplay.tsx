import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import usePatchStore from "../../store";
import { ImageDisplay } from "./component";
import { create } from "zustand";

interface StateImageDisplayProps {
  targetId?: string; // If not provided, uses the current editing target
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  pollingInterval?: number; // New prop for customizing polling interval
}

/**
 * A component that displays images based on the current state of a sprite.
 * It automatically watches for changes in the global state variable for the sprite
 * and updates the displayed image accordingly.
 */
export const StateImageDisplay: React.FC<StateImageDisplayProps> = ({
  targetId,
  width = 300,
  height = 300,
  className,
  style,
  pollingInterval = 50,
}) => {
  const patchVM = usePatchStore((state) => state.patchVM);
  const editingTarget = patchVM?.editingTarget || null;
  const editingTargetId = usePatchStore((state) => state.editingTargetId);
  const globalVariables = usePatchStore((state) => state.globalVariables);
  const getGlobalVariable = usePatchStore((state) => state.getGlobalVariable);
  
  // Use the provided targetId or fall back to the current editing target's id
  const currentTargetId = targetId || editingTargetId;
  
  // Track the current state value for this sprite
  const [currentState, setCurrentState] = useState<string | null>(null);
  
  // Effect to poll for state changes in global variables
  useEffect(() => {
    if (!currentTargetId || !patchVM) return;
    
    const checkForStateUpdates = () => {
      // Get fresh globals directly from VM
      const globals = patchVM.getGlobalVariables();

      console.log("globals", globals);
      
      // Find the state variable for this target (using the same naming convention as in SnapbotUploader)
      const strippedTargetId = currentTargetId.replace(/[^a-zA-Z0-9]/g, '');
      console.log("strippedTargetId", strippedTargetId);
      const stateVarName = `curr_state_${strippedTargetId}`;
      console.log("stateVarName", stateVarName);
      
      // Get the current state value from globals (handling both array and object formats)
      let stateValue;
      if (Array.isArray(globals)) {
        // If globals is an array of {name, value} objects
        const stateVar = globals.find(v => v.name === stateVarName);
        stateValue = stateVar ? stateVar.value : undefined;
      } else {
        // Original approach - if globals is an object
        stateValue = globals[stateVarName];
      }

      console.log("stateValue", stateValue);
      
      if (stateValue !== undefined && stateValue !== "") {
        setCurrentState(String(stateValue));
        console.log("state change detected, new state value:", String(stateValue));
      }
    };
    
    // Initial check
    checkForStateUpdates();
    
    // Set up polling interval
    const intervalId = setInterval(checkForStateUpdates, pollingInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [currentTargetId, patchVM, getGlobalVariable, pollingInterval]);
  
  return (
    <ImageDisplay
      targetId={currentTargetId}
      imageKey={currentState || undefined}
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
};

export default StateImageDisplay; 