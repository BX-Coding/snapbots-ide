import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';

import {
    getSessionBySlug,
    getHostToken,
    storeHostToken,
    subscribeToSubmissions,
    postCommand,
    SHOWCASE_SLUG,
    SnapbotSessionError,
    SubmissionSummary,
} from '../../lib/snapbotSession';

type State =
    | { kind: 'resolving' }
    | { kind: 'no-token' }
    | { kind: 'not-live'; message: string }
    | { kind: 'ready'; sessionId: string };

/** Read the host token handed off in the URL fragment (#t=...) and clear it from the bar. */
function readTokenFromHash(): string | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const t = params.get('t');
    return t ? decodeURIComponent(t) : null;
}

/**
 * Presenter's phone controller for the ASEE showcase. Resolves the showcase slug,
 * persists the host token delivered via the controller QR, then issues run/stop/delete
 * commands the laptop drains from the session command queue.
 */
export function ShowcaseController() {
    const [state, setState] = useState<State>({ kind: 'resolving' });
    const [characters, setCharacters] = useState<SubmissionSummary[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);
    // Submissions we've asked to delete — kept out of the list even if the next poll
    // still reports them (the backend may not drop them immediately).
    const deletedIdsRef = useRef<Set<string>>(new Set());

    // Resolve the live session and capture the host token from the fragment.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const session = await getSessionBySlug(SHOWCASE_SLUG);
                if (cancelled) return;
                if (session.status !== 'active') {
                    setState({ kind: 'not-live', message: 'The showcase isn’t live right now.' });
                    return;
                }
                const tokenFromHash = readTokenFromHash();
                if (tokenFromHash) {
                    storeHostToken(session.session_id, tokenFromHash);
                }
                if (!getHostToken(session.session_id)) {
                    setState({ kind: 'no-token' });
                    return;
                }
                setState({ kind: 'ready', sessionId: session.session_id });
            } catch (e) {
                if (cancelled) return;
                const err = e as SnapbotSessionError;
                const message =
                    err.code === 'SESSION_NOT_FOUND'
                        ? 'The showcase isn’t live right now.'
                        : err.message || 'Could not reach the showcase.';
                setState({ kind: 'not-live', message });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Poll the live session: refresh the character list and notice if it ends.
    const sessionId = state.kind === 'ready' ? state.sessionId : '';
    useEffect(() => {
        if (state.kind !== 'ready') return;
        unsubRef.current = subscribeToSubmissions(
            sessionId,
            {
                onSession: (s) => {
                    setCharacters(
                        s.submissions.filter(
                            (x) => x.status === 'done' && !deletedIdsRef.current.has(x.submission_id),
                        ),
                    );
                    if (s.status !== 'active') {
                        setState({ kind: 'not-live', message: `Session is ${s.status}.` });
                    }
                },
                onError: (e) => console.warn('Controller poll error:', e),
            },
            1500,
        );
        return () => { unsubRef.current?.(); unsubRef.current = null; };
    }, [state.kind, sessionId]);

    const send = async (
        label: string,
        cmd: { type: 'run' | 'stop' | 'delete'; target_submission_id?: string },
    ) => {
        setActionError(null);
        setBusy(label);
        try {
            await postCommand(sessionId, cmd);
            if (cmd.type === 'delete' && cmd.target_submission_id) {
                deletedIdsRef.current.add(cmd.target_submission_id);
                setCharacters((prev) =>
                    prev.filter((c) => c.submission_id !== cmd.target_submission_id),
                );
            }
        } catch (e) {
            const err = e as SnapbotSessionError;
            setActionError(err.message || 'Command failed');
        } finally {
            setBusy(null);
        }
    };

    if (state.kind === 'resolving') {
        return (
            <Container maxWidth="sm" sx={{ py: 6 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <CircularProgress size={20} />
                    <Typography>Connecting…</Typography>
                </Stack>
            </Container>
        );
    }

    if (state.kind === 'no-token') {
        return (
            <Container maxWidth="sm" sx={{ py: 6 }}>
                <Typography variant="h5" gutterBottom>Showcase Controller</Typography>
                <Alert severity="warning">
                    This controller needs to be opened from the controller QR code shown on the
                    laptop. Scan that QR to gain control of the scene.
                </Alert>
            </Container>
        );
    }

    if (state.kind === 'not-live') {
        return (
            <Container maxWidth="sm" sx={{ py: 6 }}>
                <Typography variant="h5" gutterBottom>Showcase Controller</Typography>
                <Alert severity="info">{state.message}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 3 }}>
            <Typography variant="h5" gutterBottom>Showcase Controller</Typography>

            {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => send('run', { type: 'run' })}
                    disabled={busy === 'run'}
                    sx={{ flex: 1, py: 2 }}
                >
                    Run
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<StopIcon />}
                    onClick={() => send('stop', { type: 'stop' })}
                    disabled={busy === 'stop'}
                    sx={{ flex: 1, py: 2 }}
                >
                    Stop
                </Button>
            </Stack>

            <Divider />

            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Characters ({characters.length})
                </Typography>
                {characters.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        No characters yet — waiting for submissions…
                    </Typography>
                )}
                <List dense>
                    {characters.map((c) => (
                        <ListItem
                            key={c.submission_id}
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label={`delete ${c.submitter_name}`}
                                    color="error"
                                    onClick={() =>
                                        send(`del-${c.submission_id}`, {
                                            type: 'delete',
                                            target_submission_id: c.submission_id,
                                        })
                                    }
                                    disabled={busy === `del-${c.submission_id}`}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <ListItemText primary={c.submitter_name} />
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Container>
    );
}

export default ShowcaseController;
