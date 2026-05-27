import { SnapbotServerResponse } from "./applySnapbotResponse";

export type SessionStatus = "active" | "ended" | "expired";
export type SubmissionStatus = "queued" | "processing" | "done" | "failed";
export type SnapbotMode = "simulation" | "hybrid" | "soccer";

export interface SubmissionSummary {
    submission_id: string;
    submitter_name: string;
    status: SubmissionStatus;
    submitted_at: string;
}

export interface SessionRecord {
    session_id: string;
    mode: SnapbotMode;
    status: SessionStatus;
    created_at: string;
    last_activity_at?: string;
    submissions: SubmissionSummary[];
}

export interface CreateSessionResponse {
    session_id: string;
    mode: SnapbotMode;
    created_at: string;
    submission_cap: number;
    /** Bearer token that authenticates the host on /end. Issued by the backend at create time. */
    host_token: string;
}

export interface Submission {
    submission_id: string;
    session_id: string;
    submitter_name: string;
    status: SubmissionStatus;
    submitted_at: string;
    modal_call_id: string | null;
    result: SnapbotServerResponse | null;
    error: string | null;
}

export interface SnapbotSessionError extends Error {
    code?: string;
    httpStatus?: number;
    details?: string;
}

const BASE = "/api/modal/session";

const HOST_TOKEN_PREFIX = "snapbotSessionHostToken:";

/** Persist a per-session host token so we can authenticate /end even after a tab reload. */
export function storeHostToken(sessionId: string, token: string): void {
    localStorage.setItem(HOST_TOKEN_PREFIX + sessionId, token);
}

export function getHostToken(sessionId: string): string | null {
    return localStorage.getItem(HOST_TOKEN_PREFIX + sessionId);
}

export function clearHostToken(sessionId: string): void {
    localStorage.removeItem(HOST_TOKEN_PREFIX + sessionId);
}

async function parseError(res: Response): Promise<SnapbotSessionError> {
    let body: any = null;
    try { body = await res.json(); } catch { /* non-JSON */ }
    const err: SnapbotSessionError = Object.assign(
        new Error(body?.error || `HTTP ${res.status}`),
        { code: body?.code, httpStatus: res.status, details: body?.details }
    );
    return err;
}

export async function createSession(mode: SnapbotMode): Promise<CreateSessionResponse> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw await parseError(res);
    const data: CreateSessionResponse = await res.json();
    if (data.host_token && data.session_id) {
        storeHostToken(data.session_id, data.host_token);
    }
    return data;
}

export async function endSession(sessionId: string): Promise<void> {
    const token = getHostToken(sessionId);
    if (!token) {
        throw Object.assign(new Error("No host token stored for this session"), {
            code: "NO_HOST_TOKEN",
        }) as SnapbotSessionError;
    }
    const res = await fetch(`${BASE}/${encodeURIComponent(sessionId)}/end`, {
        method: "POST",
        // No Content-Type, no body — /end is a token-only auth call.
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await parseError(res);
    clearHostToken(sessionId);
}

export async function getSession(sessionId: string): Promise<SessionRecord> {
    const res = await fetch(`${BASE}/${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw await parseError(res);
    return res.json();
}

export async function fetchSubmission(
    sessionId: string,
    submissionId: string
): Promise<Submission> {
    const res = await fetch(
        `${BASE}/${encodeURIComponent(sessionId)}/submission/${encodeURIComponent(submissionId)}`
    );
    if (!res.ok) throw await parseError(res);
    return res.json();
}

export async function submitPhoto(
    sessionId: string,
    args: { image: File | Blob; submitterName: string }
): Promise<{ submission_id: string; status: SubmissionStatus; session_id: string }> {
    const form = new FormData();
    // Pass the filename explicitly so the multipart part always has filename= in
    // Content-Disposition. Without that, Starlette parses the part as a string
    // field instead of an UploadFile.
    const filename = (args.image as File).name || `photo-${Date.now()}.jpg`;
    console.log(
        "[snapbotSession] submitPhoto",
        {
            sessionId,
            submitterName: args.submitterName,
            filename,
            fileType: (args.image as File).type,
            fileSize: (args.image as Blob).size,
            isFile: args.image instanceof File,
            isBlob: args.image instanceof Blob,
        }
    );
    form.append("image", args.image, filename);
    form.append("submitter_name", args.submitterName);
    const res = await fetch(`${BASE}/${encodeURIComponent(sessionId)}/submit`, {
        method: "POST",
        body: form,
        // DO NOT set Content-Type — the browser adds it with the multipart boundary.
    });
    if (!res.ok) throw await parseError(res);
    return res.json();
}

export interface SubscribeCallbacks {
    onSession?: (session: SessionRecord) => void;
    onNew?: (submission: SubmissionSummary) => void;
    onComplete?: (submission: SubmissionSummary) => void;
    onFailed?: (submission: SubmissionSummary) => void;
    onError?: (error: SnapbotSessionError) => void;
}

/**
 * Poll the session every `intervalMs` and fire callbacks as submissions appear or transition.
 * Returns an unsubscribe function. Polling stops after unsubscribe or when the session is
 * observed in a terminal state (`ended` or `expired`).
 */
export function subscribeToSubmissions(
    sessionId: string,
    cb: SubscribeCallbacks,
    intervalMs = 3000
): () => void {
    let cancelled = false;
    const seenIds = new Set<string>();
    const lastStatus = new Map<string, SubmissionStatus>();

    const tick = async () => {
        if (cancelled) return;
        try {
            const session = await getSession(sessionId);
            cb.onSession?.(session);
            for (const sub of session.submissions) {
                if (!seenIds.has(sub.submission_id)) {
                    seenIds.add(sub.submission_id);
                    cb.onNew?.(sub);
                }
                const prev = lastStatus.get(sub.submission_id);
                if (prev !== sub.status) {
                    lastStatus.set(sub.submission_id, sub.status);
                    if (sub.status === "done") cb.onComplete?.(sub);
                    if (sub.status === "failed") cb.onFailed?.(sub);
                }
            }
            if (session.status === "ended" || session.status === "expired") {
                cancelled = true;
                return;
            }
        } catch (e) {
            cb.onError?.(e as SnapbotSessionError);
        }
        if (!cancelled) setTimeout(tick, intervalMs);
    };

    void tick();
    return () => { cancelled = true; };
}

/**
 * Poll one submission until it reaches a terminal state, firing onUpdate on each status change.
 * Used by the joiner phone to show queued → processing → done/failed.
 */
export function pollSubmissionStatus(
    sessionId: string,
    submissionId: string,
    cb: { onUpdate?: (s: Submission) => void; onError?: (e: SnapbotSessionError) => void },
    intervalMs = 2000
): () => void {
    let cancelled = false;
    let lastStatus: SubmissionStatus | null = null;

    const tick = async () => {
        if (cancelled) return;
        try {
            const sub = await fetchSubmission(sessionId, submissionId);
            if (sub.status !== lastStatus) {
                lastStatus = sub.status;
                cb.onUpdate?.(sub);
            }
            if (sub.status === "done" || sub.status === "failed") {
                cancelled = true;
                return;
            }
        } catch (e) {
            cb.onError?.(e as SnapbotSessionError);
        }
        if (!cancelled) setTimeout(tick, intervalMs);
    };

    void tick();
    return () => { cancelled = true; };
}

export function buildJoinUrl(sessionId: string): string {
    if (typeof window === "undefined") return `/join/${sessionId}`;
    return `${window.location.origin}/join/${sessionId}`;
}
