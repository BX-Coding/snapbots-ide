import React, { useState, useEffect } from "react";
import { Grid, Box, Paper, Typography, Button, Stack } from "@mui/material";
import { GamePane } from "../GamePane";
import { HorizontalButtons } from "../PatchButton";
import { StartButton, StopButton } from "../GamePane/ControlButton";
import { SimplifiedSpritePane } from "../SpritePane/SimplifiedSpritePane";
import { StateImageDisplay } from "../ImageDisplay";
import { StateDiagramDisplay } from "../StateDiagram";
import usePatchStore from "../../store";
import { getSpriteImages } from "../ImageDisplay/imageDisplayStore";

export const SnapBotMode = () => {
  // Get the current editing target
  const editingTargetId = usePatchStore((state) => state.editingTargetId);
  const globalVariables = usePatchStore((state) => state.globalVariables);
  const patchVM = usePatchStore((state) => state.patchVM);
  const setGlobalVariable = usePatchStore((state) => state.setGlobalVariable);
  
  // Track the current state name
  const [currentState, setCurrentState] = useState<string | null>(null);
  // Track available states
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  
  // Update current state when global variables or editing target changes
  useEffect(() => {
    if (!editingTargetId) return;
    
    const strippedTargetId = editingTargetId.replace(/[^a-zA-Z0-9]/g, '');
    const stateVarName = `curr_state_${strippedTargetId}`;
    
    const stateVar = globalVariables.find(v => v.name === stateVarName);
    if (stateVar) {
      setCurrentState(String(stateVar.value));
    } else {
      setCurrentState(null);
    }
    
    // Get available states by checking what images exist for this sprite
    try {
      // Use the exported getSpriteImages function
      const targetImages = getSpriteImages(editingTargetId) || {};
      setAvailableStates(Object.keys(targetImages));
    } catch (error) {
      console.error("Error getting available states:", error);
      setAvailableStates([]);
    }
  }, [editingTargetId, globalVariables]);
  
  // Function to change the sprite's state
  const changeState = (newState: string) => {
    if (!editingTargetId) return;
    
    const strippedTargetId = editingTargetId.replace(/[^a-zA-Z0-9]/g, '');
    const stateVarName = `curr_state_${strippedTargetId}`;
    
    // Update the global variable
    if (patchVM) {
      patchVM.updateGlobalVariable(stateVarName, newState);
      setGlobalVariable(stateVarName, newState);
    }
  };
  
  return (
    <Grid container direction="column" sx={{ height: '100%', position: 'relative'  }}>
      {/* Centered buttons at the top */}
      <Grid 
        item 
        container 
        justifyContent="center" 
        alignItems="center"
        sx={{ 
          padding: "5px",
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1
        }}
      >
        <HorizontalButtons>
          <StartButton />
          <StopButton />
        </HorizontalButtons>
      </Grid>

      {/* Sprite pane positioned at top left */}
      <Grid 
        item 
        sx={{ 
          position: 'absolute',
          top: 75,
          left: 0,
          margin: 0,
          padding: 0,
          transform: 'scale(1.5)',
          transformOrigin: 'top left',
          height: '100%',
          width: '100%'
        }}
      >
        <SimplifiedSpritePane />
      </Grid>
      
      {/* State visualization area */}
      <Grid 
        item 
        sx={{ 
          position: 'absolute',
          top: 350,
          left: 50,
          margin: 0,
          padding: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {/* State information panel */}
        <Paper 
          elevation={2}
          sx={{ 
            padding: 2, 
            borderRadius: 2,
            backgroundColor: 'background.paper',
            width: 300
          }}
        >
          <Typography variant="h6" gutterBottom>
            Current State
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {currentState ? (
              <>Sprite is in state: <strong>{currentState}</strong></>
            ) : (
              'No state information'
            )}
          </Typography>
          
          {/* State selection buttons */}
          {availableStates.length > 0 && (
            <>
              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                Change state:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {availableStates.map((state) => (
                  <Button
                    key={state}
                    variant={currentState === state ? "contained" : "outlined"}
                    size="small"
                    onClick={() => changeState(state)}
                    sx={{ mb: 1 }}
                  >
                    {state}
                  </Button>
                ))}
              </Stack>
            </>
          )}
        </Paper>
        
        {/* State image display */}
        <StateImageDisplay 
          targetId={editingTargetId} 
          width={300} 
          height={250} 
        />
      </Grid>
      
      {/* Game pane positioned at top right */}
      <Grid 
        item 
        sx={{ 
          position: 'absolute',
          top: 0,
          right: 0,
          margin: 0,
          padding: 0,
          transform: 'scale(1.5)',
          transformOrigin: 'top right'
        }}
      >
        <GamePane hideControls={true} />
      </Grid>
    </Grid>
  );
}; 