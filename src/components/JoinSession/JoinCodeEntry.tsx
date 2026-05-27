import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Container,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

export function JoinCodeEntry() {
    const navigate = useNavigate();
    const [codeDraft, setCodeDraft] = useState('');

    const normalized = codeDraft.trim();

    const handleJoin = () => {
        if (!normalized) return;
        navigate(`/join/${encodeURIComponent(normalized)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleJoin();
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 3 }}>
            <Typography variant="h5" gutterBottom>
                Join a SnapBots session
            </Typography>
            <Stack spacing={2}>
                <Typography variant="body1">
                    Enter the code shown by the host to join their session.
                </Typography>
                <TextField
                    label="Session code"
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    inputProps={{ maxLength: 64, autoCapitalize: 'characters' }}
                />
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleJoin}
                    disabled={!normalized}
                >
                    Join
                </Button>
            </Stack>
        </Container>
    );
}
