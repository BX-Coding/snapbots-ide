import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { QRCodeSVG } from 'qrcode.react';

import {
    buildJoinUrl,
    buildShowcaseUrl,
    buildControllerUrl,
    getHostToken,
    SHOWCASE_SLUG,
    SubmissionStatus,
} from '../../lib/snapbotSession';
import { useSnapbotSessionStore } from '../../store/snapbotSessionStore';
import { useSnapbotSessionActions } from '../../hooks/useSnapbotSession';

interface HostSessionPanelProps {
    onClose: () => void;
}

const statusChip = (status: SubmissionStatus) => {
    const color: any =
        status === 'done' ? 'success' :
        status === 'failed' ? 'error' :
        status === 'processing' ? 'info' : 'default';
    return <Chip size="small" label={status} color={color} />;
};

export function HostSessionPanel({ onClose }: HostSessionPanelProps) {
    const session = useSnapbotSessionStore((s) => s.session);
    const submissions = useSnapbotSessionStore((s) => s.submissions);
    const addState = useSnapbotSessionStore((s) => s.addState);
    const initializing = useSnapbotSessionStore((s) => s.initializing);
    const starting = useSnapbotSessionStore((s) => s.starting);
    const ending = useSnapbotSessionStore((s) => s.ending);
    const error = useSnapbotSessionStore((s) => s.error);
    const preExistingIds = useSnapbotSessionStore((s) => s.preExistingIds);

    const { startSession, endSession, addSubmission } = useSnapbotSessionActions();

    const handleCopyUrl = () => {
        if (!session) return;
        navigator.clipboard?.writeText(buildJoinUrl(session.session_id)).catch(() => {});
    };

    const handleStartShowcase = () => {
        // The ASEE showcase always runs in simulation mode; claim the fixed slug so
        // snapbots.org/asee2026 points at this session.
        localStorage.setItem('snapbotMode', 'simulation');
        startSession(SHOWCASE_SLUG);
    };

    const isLoading = initializing || starting;
    const isShowcase = session?.slug === SHOWCASE_SLUG;
    const hostToken = session ? getHostToken(session.session_id) : null;

    return (
        <Box sx={{ p: 3, position: 'relative', minWidth: 360 }}>
            <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
            </IconButton>

            <Typography variant="h6" gutterBottom>
                Multi-Device Session
            </Typography>

            {isLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography>{starting ? 'Starting session...' : 'Loading...'}</Typography>
                </Box>
            )}

            {error && (
                <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
            )}

            {!session && !isLoading && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Start a session so other devices can submit photos into this project.
                    </Typography>
                    <Button variant="contained" onClick={() => startSession()}>
                        Start Session
                    </Button>
                    <Button variant="outlined" onClick={handleStartShowcase}>
                        Start ASEE Showcase
                    </Button>
                </Stack>
            )}

            {session && !isLoading && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                        <Typography variant="overline" color="text.secondary">
                            Session code
                        </Typography>
                        <Typography variant="h3" sx={{ letterSpacing: 4, fontFamily: 'monospace' }}>
                            {session.session_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Mode: {session.mode} · Status: {session.status}
                        </Typography>
                    </Box>

                    {session.status === 'active' && (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <QRCodeSVG value={buildJoinUrl(session.session_id)} size={128} />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                    {buildJoinUrl(session.session_id)}
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={handleCopyUrl}
                                    sx={{ mt: 1 }}
                                >
                                    Copy link
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {session.status === 'active' && isShowcase && (
                        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                ASEE Showcase links
                            </Typography>
                            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <QRCodeSVG value={buildShowcaseUrl()} size={120} />
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                        Audience (snapbots.org/asee2026)
                                    </Typography>
                                </Box>
                                {hostToken && (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <QRCodeSVG value={buildControllerUrl(hostToken)} size={120} />
                                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                            Controller — scan with YOUR phone only
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    )}

                    <Divider />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Submissions ({submissions.length})
                        </Typography>
                        {submissions.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Waiting for photos...
                            </Typography>
                        )}
                        <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
                            {submissions.map((s) => {
                                const localState = addState[s.submission_id] || 'idle';
                                const wasPreExisting = preExistingIds.has(s.submission_id);
                                const renderAction = () => {
                                    if (s.status === 'done') {
                                        if (localState === 'added') {
                                            return <Chip size="small" label="added" color="success" variant="outlined" />;
                                        }
                                        if (localState === 'adding') {
                                            return <Button size="small" variant="contained" disabled>Adding...</Button>;
                                        }
                                        // Manual Add for pre-existing submissions (resume case) and
                                        // for any failed-apply retries.
                                        if (wasPreExisting || localState === 'error') {
                                            return (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => addSubmission(s.submission_id)}
                                                >
                                                    {localState === 'error' ? 'Retry' : 'Add'}
                                                </Button>
                                            );
                                        }
                                        // Fresh submission still being auto-applied — show pending chip.
                                        return <Chip size="small" label="pending" color="info" variant="outlined" />;
                                    }
                                    return statusChip(s.status);
                                };
                                return (
                                    <ListItem key={s.submission_id} secondaryAction={renderAction()}>
                                        <ListItemText
                                            primary={s.submitter_name}
                                            secondary={s.error || new Date(s.submitted_at).toLocaleTimeString()}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>

                    {session.status === 'active' && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={endSession}
                            disabled={ending}
                        >
                            {ending ? 'Ending...' : 'End Session'}
                        </Button>
                    )}
                    {session.status !== 'active' && (
                        <Button variant="contained" onClick={() => startSession()}>
                            Start New Session
                        </Button>
                    )}
                </Stack>
            )}
        </Box>
    );
}
