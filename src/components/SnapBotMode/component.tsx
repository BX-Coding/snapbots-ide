import React from "react";
import { Grid, Box } from "@mui/material";
import { GamePane } from "../GamePane";
import { HorizontalButtons } from "../PatchButton";
import { StartButton, StopButton } from "../GamePane/ControlButton";
import { SimplifiedSpritePane } from "../SpritePane/SimplifiedSpritePane";

export const SnapBotMode = () => {
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