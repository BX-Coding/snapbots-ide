import React, { useEffect, useState } from 'react';
import { Alert, CircularProgress, Container, Stack, Typography } from '@mui/material';

import { JoinSession } from '../JoinSession';
import {
    getSessionBySlug,
    SHOWCASE_SLUG,
    SnapbotSessionError,
} from '../../lib/snapbotSession';

type State =
    | { kind: 'resolving' }
    | { kind: 'ready'; sessionId: string }
    | { kind: 'not-live'; message: string };

/**
 * Public, code-free entry for the ASEE 2026 showcase (snapbots.org/asee2026).
 * Resolves the fixed "asee2026" slug to whatever session the laptop currently has
 * live, then hands off to the existing JoinSession capture flow with a big
 * photo-icon landing screen. Audience members never type a 6-digit code.
 */
export function Asee2026Capture() {
    const [state, setState] = useState<State>({ kind: 'resolving' });

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
                setState({ kind: 'ready', sessionId: session.session_id });
            } catch (e) {
                if (cancelled) return;
                const err = e as SnapbotSessionError;
                const message =
                    err.code === 'SESSION_NOT_FOUND'
                        ? 'The showcase isn’t live right now. Please check back during the demo.'
                        : err.message || 'Could not reach the showcase. Check your connection.';
                setState({ kind: 'not-live', message });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (state.kind === 'resolving') {
        return (
            <Container maxWidth="sm" sx={{ py: 6 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <CircularProgress size={20} />
                    <Typography>Connecting to the showcase…</Typography>
                </Stack>
            </Container>
        );
    }

    if (state.kind === 'not-live') {
        return (
            <Container maxWidth="sm" sx={{ py: 6 }}>
                <Typography variant="h5" gutterBottom>
                    SnapBots @ ASEE 2026
                </Typography>
                <Alert severity="info">{state.message}</Alert>
            </Container>
        );
    }

    return (
        <JoinSession
            sessionIdOverride={state.sessionId}
            landing
            heading="SnapBots @ ASEE 2026"
        />
    );
}

export default Asee2026Capture;
