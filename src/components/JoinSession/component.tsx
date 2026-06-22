import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

import { CameraCapture } from '../SpritePane/CameraCapture';
import { ImageCropper } from '../SpritePane/ImageCropper';
import {
    getSession,
    submitPhoto,
    pollSubmissionStatus,
    SnapbotSessionError,
    Submission,
} from '../../lib/snapbotSession';

type Phase =
    | { kind: 'loading' }
    | { kind: 'invalid'; message: string }
    | { kind: 'landing' }
    | { kind: 'name-entry' }
    | { kind: 'capture' }
    | { kind: 'crop'; imageSrc: string }
    | { kind: 'review'; file: File; dataUrl: string }
    | { kind: 'submitting' }
    | { kind: 'processing'; status: Submission['status']; submissionId: string }
    | { kind: 'success' }
    | { kind: 'error'; message: string };

const NAME_STORAGE_KEY_PREFIX = 'snapbotJoinerName:';

export interface JoinSessionProps {
    /** When set, use this session id instead of the :code route param (showcase slug flow). */
    sessionIdOverride?: string;
    /** Show a big "take a photo" landing screen before the capture flow. */
    landing?: boolean;
    /** Optional heading; defaults to "SnapBots — Session {id}". */
    heading?: string;
}

export function JoinSession({ sessionIdOverride, landing, heading }: JoinSessionProps = {}) {
    const { code } = useParams<{ code: string }>();
    const sessionId = sessionIdOverride ?? code ?? '';

    const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
    const [nameDraft, setNameDraft] = useState('');
    const [submitterName, setSubmitterName] = useState('');
    const pollerRef = useRef<(() => void) | null>(null);

    // Validate the session exists, restore saved name if any.
    useEffect(() => {
        if (!sessionId) {
            setPhase({ kind: 'invalid', message: 'Missing session code' });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const s = await getSession(sessionId);
                if (cancelled) return;
                if (s.status !== 'active') {
                    setPhase({ kind: 'invalid', message: `Session is ${s.status}` });
                    return;
                }
                const saved = sessionStorage.getItem(NAME_STORAGE_KEY_PREFIX + sessionId);
                if (saved) {
                    setSubmitterName(saved);
                    setNameDraft(saved);
                }
                if (landing) {
                    setPhase({ kind: 'landing' });
                } else if (saved) {
                    setPhase({ kind: 'capture' });
                } else {
                    setPhase({ kind: 'name-entry' });
                }
            } catch (e) {
                const err = e as SnapbotSessionError;
                const msg = err.code === 'SESSION_NOT_FOUND'
                    ? `No session found for code ${sessionId}`
                    : err.message || 'Could not reach session';
                setPhase({ kind: 'invalid', message: msg });
            }
        })();
        return () => { cancelled = true; };
    }, [sessionId, landing]);

    const handleStartFromLanding = () => {
        const saved = sessionStorage.getItem(NAME_STORAGE_KEY_PREFIX + sessionId);
        setPhase(saved ? { kind: 'capture' } : { kind: 'name-entry' });
    };

    // Cleanup any active poller on unmount.
    useEffect(() => () => { pollerRef.current?.(); }, []);

    const handleJoin = () => {
        const trimmed = nameDraft.trim().slice(0, 64);
        if (!trimmed) return;
        setSubmitterName(trimmed);
        sessionStorage.setItem(NAME_STORAGE_KEY_PREFIX + sessionId, trimmed);
        setPhase({ kind: 'capture' });
    };

    const handleImageCaptured = (_file: File, dataUrl: string) => {
        setPhase({ kind: 'crop', imageSrc: dataUrl });
    };

    const handleCropComplete = (file: File, dataUrl: string) => {
        setPhase({ kind: 'review', file, dataUrl });
    };

    const handleCropCancel = () => {
        setPhase({ kind: 'capture' });
    };

    const handleSubmit = async (file: File) => {
        setPhase({ kind: 'submitting' });
        try {
            const res = await submitPhoto(sessionId, { image: file, submitterName });
            setPhase({ kind: 'processing', status: 'queued', submissionId: res.submission_id });
            pollerRef.current?.();
            pollerRef.current = pollSubmissionStatus(
                sessionId,
                res.submission_id,
                {
                    onUpdate: (sub) => {
                        if (sub.status === 'done') {
                            setPhase({ kind: 'success' });
                        } else if (sub.status === 'failed') {
                            setPhase({ kind: 'error', message: sub.error || 'Generation failed' });
                        } else {
                            setPhase((prev) =>
                                prev.kind === 'processing'
                                    ? { ...prev, status: sub.status }
                                    : prev
                            );
                        }
                    },
                    onError: (e) => {
                        console.warn('Poll error:', e);
                    },
                },
            );
        } catch (e) {
            const err = e as SnapbotSessionError;
            setPhase({ kind: 'error', message: err.message || 'Submit failed' });
        }
    };

    const handleSubmitAnother = () => {
        setPhase({ kind: 'capture' });
    };

    return (
        <Container maxWidth="sm" sx={{ py: 3 }}>
            <Typography variant="h5" gutterBottom>
                {heading ?? `SnapBots — Session ${sessionId}`}
            </Typography>

            {phase.kind === 'loading' && (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography>Checking session...</Typography>
                </Stack>
            )}

            {phase.kind === 'invalid' && (
                <Alert severity="error">{phase.message}</Alert>
            )}

            {phase.kind === 'landing' && (
                <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                    <Typography variant="body1" align="center" color="text.secondary">
                        Draw a robot on paper, then tap to photograph it and watch your
                        character come alive on the big screen.
                    </Typography>
                    <IconButton
                        onClick={handleStartFromLanding}
                        aria-label="Take a photo of your diagram"
                        sx={{
                            width: 160,
                            height: 160,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': { bgcolor: 'primary.dark' },
                        }}
                    >
                        <PhotoCameraIcon sx={{ fontSize: 88 }} />
                    </IconButton>
                    <Typography variant="h6">Take a photo</Typography>
                </Stack>
            )}

            {phase.kind === 'name-entry' && (
                <Stack spacing={2}>
                    <Typography variant="body1">
                        Pick a name so the host knows whose character is whose.
                    </Typography>
                    <TextField
                        label="Your name"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        autoFocus
                        inputProps={{ maxLength: 64 }}
                    />
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleJoin}
                        disabled={!nameDraft.trim()}
                    >
                        Join
                    </Button>
                </Stack>
            )}

            {phase.kind === 'capture' && (
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Welcome, {submitterName}. Take a photo of your paper diagram.
                    </Typography>
                    <CameraCapture
                        onImageCaptured={handleImageCaptured}
                        facingMode="environment"
                        compactPreview={{ aspectRatio: '4 / 3', maxHeight: '35vh' }}
                    />
                </Stack>
            )}

            {phase.kind === 'crop' && (
                <ImageCropper
                    imageSrc={phase.imageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            {phase.kind === 'review' && (
                <Stack spacing={2}>
                    <img
                        src={phase.dataUrl}
                        alt="cropped"
                        style={{ width: '100%', borderRadius: 8 }}
                    />
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => setPhase({ kind: 'capture' })}>
                            Retake
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => handleSubmit(phase.file)}
                            sx={{ flex: 1 }}
                        >
                            Submit
                        </Button>
                    </Stack>
                </Stack>
            )}

            {phase.kind === 'submitting' && (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography>Uploading...</Typography>
                </Stack>
            )}

            {phase.kind === 'processing' && (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography>
                        {phase.status === 'queued' ? 'Waiting in queue...' : 'Generating sprite...'}
                    </Typography>
                </Stack>
            )}

            {phase.kind === 'success' && (
                <Stack spacing={2}>
                    <Alert severity="success">
                        Your sprite has been added to the project.
                    </Alert>
                    <Button variant="contained" onClick={handleSubmitAnother}>
                        Submit another photo
                    </Button>
                </Stack>
            )}

            {phase.kind === 'error' && (
                <Stack spacing={2}>
                    <Alert severity="error">{phase.message}</Alert>
                    <Button variant="outlined" onClick={handleSubmitAnother}>
                        Try again
                    </Button>
                </Stack>
            )}
        </Container>
    );
}
