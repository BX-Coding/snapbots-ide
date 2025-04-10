import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import usePatchStore from '../../store';
import { StateImageDisplay } from '../ImageDisplay';

interface StateDiagramDisplayProps {
  targetId?: string; // If not provided, uses the editing target
  width?: string | number;
  height?: string | number;
}

/**
 * Component to display the current state and state diagram for a sprite
 */
export const StateDiagramDisplay: React.FC<StateDiagramDisplayProps> = ({
  targetId,
  width = '100%',
  height = 'auto',
}) => {
  const patchVM = usePatchStore((state) => state.patchVM);
  const editingTargetId = usePatchStore((state) => state.editingTargetId);
  const globalVariables = usePatchStore((state) => state.globalVariables);
  
  // Use the provided targetId or fall back to editing target
  const currentTargetId = targetId || editingTargetId;
  
  // Track the current state name
  const [currentStateName, setCurrentStateName] = useState<string | null>(null);
  
  // Effect to update current state when global variables change
  useEffect(() => {
    if (!currentTargetId) return;
    
    // Use the same naming convention as in SnapbotUploader
    const strippedTargetId = currentTargetId.replace(/[^a-zA-Z0-9]/g, '');
    const stateVarName = `curr_state_${strippedTargetId}`;
    
    // Find the corresponding global variable
    const stateVar = globalVariables.find(v => v.name === stateVarName);
    if (stateVar) {
      setCurrentStateName(String(stateVar.value));
    }
  }, [currentTargetId, globalVariables]);
  
  if (!currentTargetId) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2">No sprite selected</Typography>
      </Box>
    );
  }
  
  return (
    <Paper 
      elevation={0}
      sx={{
        width,
        height,
        p: 2,
        borderRadius: 1,
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="h6" gutterBottom>
        State Diagram
      </Typography>
      
      {currentStateName ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Current State: <strong>{currentStateName}</strong>
          </Typography>
          
          <Box sx={{ width: '100%', height: 200 }}>
            <StateImageDisplay
              targetId={currentTargetId}
              width="100%"
              height="100%"
            />
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No state information available for this sprite
        </Typography>
      )}
    </Paper>
  );
};

export default StateDiagramDisplay; 