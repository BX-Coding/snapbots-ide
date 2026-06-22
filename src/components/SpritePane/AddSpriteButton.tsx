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
import { SHOWCASE_SLUG } from '../../lib/snapbotSession';

export function AddSpriteButton() {
    const showModalSelector = usePatchStore((state) => state.showModalSelector);
    const uploadSprite = useUploadSprite();
    const openAssetFileSelector = useAssetFileSelector(['.png', '.svg', '.jpg', '.jpeg', '.bmp', '.gif']);
    const [snapbotDialogOpen, setSnapbotDialogOpen] = useState(false);
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const { startSession, endSession } = useSnapbotSessionActions();
    const activeSessionId = useSnapbotSessionStore(
        (s) => s.session?.status === 'active' ? s.session.session_id : null
    );
    const activeSessionSlug = useSnapbotSessionStore(
        (s) => s.session?.status === 'active' ? s.session.slug : undefined
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

    const handleStartShowcase = async () => {
        setSessionDialogOpen(true);
        // If the showcase session is already live, just show the panel (and its QRs).
        if (activeSessionId && activeSessionSlug === SHOWCASE_SLUG) return;
        // Otherwise (re)claim the slug. End any unrelated active session first so we
        // don't leave an orphaned regular session running.
        if (activeSessionId) {
            await endSession();
        }
        localStorage.setItem('snapbotMode', 'simulation');
        void startSession(SHOWCASE_SLUG);
    }

    return (
        <Grid container justifyContent="center">
            <DropdownMenu type="icon" icon={<AddIcon />} options={[
                { label: 'From Built-In', onClick: handleBuiltIn },
                { label: 'From Upload', onClick: handleUpload },
                { label: 'Snapbot Sprite', onClick: handleSnapbot },
                { label: 'Start Multi-Device Session', onClick: handleStartSession },
                { label: 'Start ASEE Showcase', onClick: handleStartShowcase },
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