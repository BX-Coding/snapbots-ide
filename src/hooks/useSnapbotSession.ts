import { useCallback, useEffect, useRef } from "react";
import {
    createSession as apiCreateSession,
    endSession as apiEndSession,
    getSession,
    fetchSubmission,
    subscribeToSubmissions,
    SnapbotMode,
} from "../lib/snapbotSession";
import {
    applySnapbotResponse,
    ApplySnapbotResponseDeps,
    useApplySnapbotResponseDeps,
} from "../lib/applySnapbotResponse";
import { useSnapbotSessionStore } from "../store/snapbotSessionStore";

const SESSION_ID_KEY = "snapbotSessionId";

// Module-level apply queue shared by the listener (auto-apply) and the actions hook
// (manual Add). Serializes all sprite-creation work since editingTarget is a global
// the apply pipeline mutates.
let applyQueue: Promise<unknown> = Promise.resolve();

type ApplyDeps = ApplySnapbotResponseDeps & {
    onAddSprite: () => Promise<string | undefined>;
};

function enqueueApply(sessionId: string, submissionId: string, deps: ApplyDeps) {
    useSnapbotSessionStore.getState().setAddItemState(submissionId, "adding");
    applyQueue = applyQueue.then(async () => {
        try {
            const full = await fetchSubmission(sessionId, submissionId);
            if (!full.result) throw new Error("Submission has no result");
            const newTargetId = await deps.onAddSprite();
            if (!newTargetId) throw new Error("Failed to create sprite target");
            await applySnapbotResponse(full.result, newTargetId, deps, {
                overrideSpriteName: full.submitter_name,
                backendUuid: full.submission_id,
            });
            useSnapbotSessionStore.getState().setAddItemState(submissionId, "added");
        } catch (e) {
            console.error("Failed to add submission", submissionId, e);
            useSnapbotSessionStore.getState().setAddItemState(submissionId, "error");
        }
    }).catch(() => {});
}

/**
 * Drives the always-on session lifecycle: resumes from localStorage on mount,
 * polls the active session, auto-applies new submissions through the apply queue.
 * Call this ONCE at the app level (PatchApp) so polling survives the session
 * panel dialog being closed.
 */
export function useSnapbotSessionListener() {
    const applyDeps = useApplySnapbotResponseDeps();
    const applyDepsRef = useRef<ApplyDeps>(applyDeps);
    useEffect(() => { applyDepsRef.current = applyDeps; }, [applyDeps]);

    // Resume from localStorage on mount.
    useEffect(() => {
        let cancelled = false;
        const store = useSnapbotSessionStore.getState();
        (async () => {
            const saved = localStorage.getItem(SESSION_ID_KEY);
            if (saved) {
                try {
                    const existing = await getSession(saved);
                    if (cancelled) return;
                    if (existing.status === "active") {
                        store.setPreExistingIds(
                            new Set(existing.submissions.map((s) => s.submission_id))
                        );
                        store.setSession(existing);
                        store.setSubmissions(existing.submissions);
                    } else {
                        localStorage.removeItem(SESSION_ID_KEY);
                    }
                } catch {
                    localStorage.removeItem(SESSION_ID_KEY);
                }
            }
            if (!cancelled) store.setInitializing(false);
        })();
        return () => { cancelled = true; };
    }, []);

    // Poll while a session is active.
    const sessionId = useSnapbotSessionStore((s) => s.session?.session_id ?? null);
    const sessionStatus = useSnapbotSessionStore((s) => s.session?.status ?? null);
    useEffect(() => {
        if (!sessionId || sessionStatus !== "active") return;
        const store = useSnapbotSessionStore.getState();
        const unsub = subscribeToSubmissions(sessionId, {
            onSession: (s) => {
                store.setSubmissions(s.submissions);
                if (s.status !== "active") store.setSession(s);
            },
            onComplete: (sub) => {
                if (useSnapbotSessionStore.getState().preExistingIds.has(sub.submission_id)) return;
                enqueueApply(sessionId, sub.submission_id, applyDepsRef.current);
            },
            onFailed: (sub) => {
                fetchSubmission(sessionId, sub.submission_id)
                    .then((full) =>
                        store.patchSubmission(sub.submission_id, { error: full.error })
                    )
                    .catch(() => {});
            },
            onError: (e) => console.warn("Session poll error:", e),
        });
        return unsub;
    }, [sessionId, sessionStatus]);
}

/**
 * Actions for any component to drive the session: start, end, and manually add
 * a specific submission. Safe to call from multiple components — the underlying
 * state lives in useSnapbotSessionStore and the apply queue is module-level.
 */
export function useSnapbotSessionActions() {
    const applyDeps = useApplySnapbotResponseDeps();
    const applyDepsRef = useRef<ApplyDeps>(applyDeps);
    useEffect(() => { applyDepsRef.current = applyDeps; }, [applyDeps]);

    const startSession = useCallback(async (): Promise<string | null> => {
        const store = useSnapbotSessionStore.getState();
        store.setError(null);
        store.setStarting(true);
        try {
            const mode = (localStorage.getItem("snapbotMode") || "simulation") as SnapbotMode;
            const created = await apiCreateSession(mode);
            localStorage.setItem(SESSION_ID_KEY, created.session_id);
            store.setPreExistingIds(new Set());
            store.setSession({
                session_id: created.session_id,
                mode: created.mode,
                status: "active",
                created_at: created.created_at,
                submissions: [],
            });
            store.setSubmissions([]);
            return created.session_id;
        } catch (e: any) {
            store.setError(`Failed to start session: ${e?.message || "unknown error"}`);
            return null;
        } finally {
            store.setStarting(false);
        }
    }, []);

    const endSession = useCallback(async () => {
        const store = useSnapbotSessionStore.getState();
        const sess = store.session;
        if (!sess) return;
        store.setEnding(true);
        try {
            await apiEndSession(sess.session_id);
            localStorage.removeItem(SESSION_ID_KEY);
            store.setSession({ ...sess, status: "ended" });
        } catch (e: any) {
            store.setError(`Failed to end session: ${e?.message || "unknown error"}`);
        } finally {
            store.setEnding(false);
        }
    }, []);

    const addSubmission = useCallback((submissionId: string) => {
        const sess = useSnapbotSessionStore.getState().session;
        if (!sess) return;
        enqueueApply(sess.session_id, submissionId, applyDepsRef.current);
    }, []);

    return { startSession, endSession, addSubmission };
}
