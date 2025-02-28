import React, { useState } from 'react';
import Grid from '@mui/material/Grid';

import usePatchStore, { ModalSelectorType } from '../../store';
import { DropdownMenu } from '../DropdownMenu';
import AddIcon from '@mui/icons-material/Add';
import { useUploadSprite } from './useSpriteUpload';
import { useAssetFileSelector } from '../../hooks/useAssetFileSelector';
import { SnapbotUploader } from './SnapbotUploader';
import { Dialog } from '@mui/material';

export function AddSpriteButton() {
    const showModalSelector = usePatchStore((state) => state.showModalSelector);
    const uploadSprite = useUploadSprite();
    const openAssetFileSelector = useAssetFileSelector(['.png', '.svg', '.jpg', '.jpeg', '.bmp', '.gif']);
    const [snapbotDialogOpen, setSnapbotDialogOpen] = useState(false);

    const handleUpload = async () => {
        const selectedFile = await openAssetFileSelector();
        console.warn("Selected File", selectedFile);
        uploadSprite(selectedFile);
    };

    const handleBuiltIn = () => {
        showModalSelector(ModalSelectorType.SPRITE);
    }

    const handleSnapbot = () => {
        setSnapbotDialogOpen(true);
    }

    return (
        <Grid container justifyContent="center">
            <DropdownMenu type="icon" icon={<AddIcon />} options={[
                { label: 'From Built-In', onClick: handleBuiltIn },
                { label: 'From Upload', onClick: handleUpload },
                { label: 'Snapbot Sprite', onClick: handleSnapbot },
            ]}/>
            
            <Dialog 
                open={snapbotDialogOpen} 
                onClose={() => setSnapbotDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { 
                        position: 'fixed', 
                        left: 16, 
                        m: 0,
                        height: 'auto',
                        maxHeight: '80vh'
                    }
                }}
            >
                <SnapbotUploader onClose={() => setSnapbotDialogOpen(false)} />
            </Dialog>
        </Grid>
    );
}