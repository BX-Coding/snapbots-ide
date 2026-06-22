import { useCallback, useEffect, useRef } from "react";
import {
    createSession as apiCreateSession,
    endSession as apiEndSession,
    getSession,
    fetchSubmission,
    subscribeToSubmissions,
    ackCommand,
    SnapbotMode,
    SessionCommand,
} from "../lib/snapbotSession";
import {
    applySnapbotResponse,
    ApplySnapbotResponseDeps,
    useApplySnapbotResponseDeps,
} from "../lib/applySnapbotResponse";
import { useSnapbotSessionStore } from "../store/snapbotSessionStore";
import usePatchStore from "../store";

const SESSION_ID_KEY = "snapbotSessionId";

// Module-level apply queue shared by the listener (auto-apply) and the actions hook
// (manual Add). Serializes all sprite-creation work since editingTarget is a global
// the apply pipeline mutates.
let applyQueue: Promise<unknown> = Promise.resolve();

// Maps a backend submission_id to the frontend sprite target it produced, so the
// remote controller's "delete this character" command can find the right sprite.
const submissionToTarget = new Map<string, string>();
// Command ids we've already executed this session, guarding against double-firing
// between issuing a command and the backend marking it consumed (post-ack poll).
const executedCommands = new Set<string>();

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
            submissionToTarget.set(submissionId, newTargetId);
            useSnapbotSessionStore.getState().setAddItemState(submissionId, "added");
        } catch (e) {
            console.error("Failed to add submission", submissionId, e);
            useSnapbotSessionStore.getState().setAddItemState(submissionId, "error");
        }
    }).catch(() => {});
}

/**
 * Execute a remote-control command issued by the presenter's controller phone, then
 * ack it so the host never replays it. Run/Stop mirror the green-flag/stop buttons
 * (GamePane/ControlButton); Delete mirrors DeleteSpriteButton but resolves the sprite
 * from the submission_id via submissionToTarget.
 */
async function runShowcaseCommand(sessionId: string, cmd: SessionCommand) {
    if (executedCommands.has(cmd.command_id)) return;
    executedCommands.add(cmd.command_id);
    try {
        const store = usePatchStore.getState();
        const patchVM = store.patchVM;
        if (!patchVM) return;

        if (cmd.type === "run") {
            store.clearRuntimeDiagnostics();
            await store.saveAllThreads();
            await patchVM.greenFlag();
        } else if (cmd.type === "stop") {
            patchVM.stopAll();
        } else if (cmd.type === "delete" && cmd.target_submission_id) {
            const targetId = submissionToTarget.get(cmd.target_submission_id);
            if (targetId) {
                const target = patchVM.runtime.getTargetById(targetId);
                if (target) {
                    store.saveTargetThreads(target);
                    patchVM.runtime.emit("targetWasRemoved", target);
                    await patchVM.deleteSprite(targetId);
                    const ids = usePatchStore.getState().targetIds;
                    const deletedIndex = ids.indexOf(targetId);
                    const remaining = ids.filter((id) => id !== targetId);
                    usePatchStore.getState().setTargetIds(remaining);
                    if (usePatchStore.getState().editingTargetId === targetId) {
                        const newIndex = deletedIndex > 1 ? deletedIndex - 1 : 0;
                        const next = remaining[newIndex] ?? remaining[0] ?? "";
                        patchVM.setEditingTarget?.(next);
                        usePatchStore.getState().setEditingTargetId(next);
                    }
                }
                submissionToTarget.delete(cmd.target_submission_id);
            }
            // Drop it from the session store so host panels / counts update locally.
            const sess = useSnapbotSessionStore.getState();
            sess.setSubmissions(
                sess.submissions.filter((s) => s.submission_id !== cmd.target_submission_id)
            );
        }
    } catch (e) {
        console.error("Failed to run showcase command", cmd, e);
    } finally {
        ackCommand(sessionId, cmd.command_id).catch(() => {});
    }
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
            onCommands: (cmds) => {
                for (const c of cmds) void runShowcaseCommand(sessionId, c);
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

    const startSession = useCallback(async (slug?: string): Promise<string | null> => {
        const store = useSnapbotSessionStore.getState();
        store.setError(null);
        store.setStarting(true);
        try {
            const mode = (localStorage.getItem("snapbotMode") || "simulation") as SnapbotMode;
            const created = await apiCreateSession(mode, slug);
            localStorage.setItem(SESSION_ID_KEY, created.session_id);
            store.setPreExistingIds(new Set());
            // Fresh session: clear any stale command/target bookkeeping from a prior run.
            submissionToTarget.clear();
            executedCommands.clear();
            store.setSession({
                session_id: created.session_id,
                mode: created.mode,
                status: "active",
                created_at: created.created_at,
                submissions: [],
                slug,
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
