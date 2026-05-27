import React, { useState } from 'react';
import Grid from '@mui/material/Grid';

import usePatchStore, { ModalSelectorType } from '../../store';
import { DropdownMenu } from '../DropdownMenu';
import AddIcon from '@mui/icons-material/Add';
import { useUploadSprite } from './useSpriteUpload';
import { useAssetFileSelector } from '../../hooks/useAssetFileSelector';
import { SnapbotUploader } from './SnapbotUploader';
import { HostSessionPanel } from '../HostSessionPanel';
import { Dialog } from '@mui/material';
import { useSnapbotSessionActions } from '../../hooks/useSnapbotSession';
import { useSnapbotSessionStore } from '../../store/snapbotSessionStore';

export function AddSpriteButton() {
    const showModalSelector = usePatchStore((state) => state.showModalSelector);
    const uploadSprite = useUploadSprite();
    const openAssetFileSelector = useAssetFileSelector(['.png', '.svg', '.jpg', '.jpeg', '.bmp', '.gif']);
    const [snapbotDialogOpen, setSnapbotDialogOpen] = useState(false);
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const { startSession } = useSnapbotSessionActions();
    const activeSessionId = useSnapbotSessionStore(
        (s) => s.session?.status === 'active' ? s.session.session_id : null
    );

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

    const handleStartSession = () => {
        setSessionDialogOpen(true);
        // Auto-start a session if none is active. If one is, just show the panel
        // so the host can grab the existing code/QR.
        if (!activeSessionId) {
            void startSession();
        }
    }

    return (
        <Grid container justifyContent="center">
            <DropdownMenu type="icon" icon={<AddIcon />} options={[
                { label: 'From Built-In', onClick: handleBuiltIn },
                { label: 'From Upload', onClick: handleUpload },
                { label: 'Snapbot Sprite', onClick: handleSnapbot },
                { label: 'Start Multi-Device Session', onClick: handleStartSession },
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

            <Dialog
                open={sessionDialogOpen}
                onClose={() => setSessionDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {sessionDialogOpen && (
                    <HostSessionPanel onClose={() => setSessionDialogOpen(false)} />
                )}
            </Dialog>
        </Grid>
    );
}