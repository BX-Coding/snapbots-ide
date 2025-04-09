import React, { useState } from "react";
import { Grid, Box } from "@mui/material";
import { GamePane } from "../GamePane";
import { HorizontalButtons } from "../PatchButton";
import { StartButton, StopButton } from "../GamePane/ControlButton";
import { SimplifiedSpritePane } from "../SpritePane/SimplifiedSpritePane";
import { ImageDisplay } from "../ImageDisplay";

export const SnapBotMode = () => {
  // State to control which image to display
  const [currentImageKey, setCurrentImageKey] = useState<string | undefined>(undefined);

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
      
      {/* Image Display component positioned under the sprite pane and to the left of the game pane */}
      <Grid 
        item 
        sx={{ 
          position: 'absolute',
          top: 350,
          left: 50,
          margin: 0,
          padding: 0,
          zIndex: 1
        }}
      >
        <ImageDisplay 
          imageKey={currentImageKey} 
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