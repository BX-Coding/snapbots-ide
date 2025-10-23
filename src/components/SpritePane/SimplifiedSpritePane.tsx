import React from 'react';
import { AddSpriteButton } from "./AddSpriteButton";
import { DeleteSpriteButton } from "./DeleteSpriteButton";
import { SpriteCard } from "./SpriteCard";
import { SpriteAttributePane } from "./SpriteAttributeArea";

import Grid from '@mui/material/Grid';
import { HorizontalButtons } from '../PatchButton';
import usePatchStore from '../../store';
import { Target } from '../EditorPane/types';
import { useEditingTarget } from '../../hooks/useEditingTarget';
import { Box } from '@mui/material';

export function SimplifiedSpritePane() {
    const patchVM = usePatchStore((state) => state.patchVM);
    const targetIds = usePatchStore((state) => state.targetIds);
    const [editingTarget] = useEditingTarget() as [Target, (target: Target) => void];
    
    return(
        <Box className="assetHolder" sx={{
            backgroundColor: 'panel.main',
            padding: "8px",
            paddingTop: "0px",
            borderLeftWidth: "1px",
            borderColor: 'divider',
        }}>
            <HorizontalButtons sx={{borderWidth: '0px', marginLeft: '-8px', marginRight: '-8px', width: 'calc(100% + 16px)', padding: '4px', paddingBottom: '8px', marginBottom: '0px', borderTopWidth: '1px', borderBottomWidth: '1px', borderColor: 'divider', borderStyle: 'solid'}}>
                <AddSpriteButton />
                {editingTarget && <DeleteSpriteButton /> }
            </HorizontalButtons>
            <Grid container direction="row" spacing={"8px"} sx={{
                backgroundColor: 'panel.main',
                margin: '-8px',
                marginTop: '0px',
                minWidth: 'calc(100% + 16px)',
                minHeight: '120px',
                height: 'calc(100vh - 649px)',
                maxHeight: 'calc(100vh - 649px)',
                overflowY: 'auto',
                paddingBottom: '8px',
                justifyContent: 'left',
                alignContent: 'start'
            }}>
            {targetIds.map((targetId) => {
                const target = patchVM.runtime.getTargetById(targetId);
                return (
                    target ? ((target.isSprite() && !target.sprite.isStage) && <Grid item key={target.id} sx={{maxWidth: '136px', maxHeight: '136px'}}><SpriteCard target={target} /></Grid>) : <></>
                );
            })}
            </Grid>
        </Box>
    );
} 