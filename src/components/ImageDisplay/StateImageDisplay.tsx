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
  
  // Effect to detect state changes in global variables
  useEffect(() => {
    if (!currentTargetId) return;

    const globals = patchVM.getGlobalVariables();

    console.log(`VM Globals: ${JSON.stringify(globals)}`);

    console.log(`Current target ID: ${currentTargetId}`);
    
    // Find the state variable for this target (using the same naming convention as in SnapbotUploader)
    const strippedTargetId = currentTargetId.replace(/[^a-zA-Z0-9]/g, '');
    const stateVarName = `curr_state_${strippedTargetId}`;
    
    // Get the current state value using getGlobalVariable
    const stateValue = getGlobalVariable(stateVarName);
    const newState = getGlobalVariable("duncan");
    console.log(`State variable: ${stateVarName} = ${stateValue}`);
    console.log(`New state: ${newState}`);
    
    if (stateValue !== "") {
      setCurrentState(String(stateValue));
    }
  }, [currentTargetId, globalVariables, getGlobalVariable]);
  
  return (
    <ImageDisplay
      targetId={currentTargetId}
      imageKey={currentState || undefined}
      width={width}
      height={height}
    />
  );
};

export default StateImageDisplay; 