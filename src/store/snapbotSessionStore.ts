import { create } from "zustand";
import { SessionRecord, SubmissionSummary } from "../lib/snapbotSession";

export type AddItemState = "idle" | "adding" | "added" | "error";
export type SubmissionUi = SubmissionSummary & { error?: string | null };

interface SnapbotSessionState {
    session: SessionRecord | null;
    submissions: SubmissionUi[];
    addState: Record<string, AddItemState>;
    /**
     * Submission IDs that were already present when the listener mounted/resumed —
     * these get manual Add buttons rather than being auto-applied. New submissions
     * that arrive after mount auto-apply through the queue.
     */
    preExistingIds: Set<string>;
    initializing: boolean;
    starting: boolean;
    ending: boolean;
    error: string | null;
    setSession: (session: SessionRecord | null) => void;
    setSubmissions: (subs: SubmissionUi[]) => void;
    patchSubmission: (id: string, patch: Partial<SubmissionUi>) => void;
    setAddItemState: (id: string, state: AddItemState) => void;
    setPreExistingIds: (ids: Set<string>) => void;
    setInitializing: (b: boolean) => void;
    setStarting: (b: boolean) => void;
    setEnding: (b: boolean) => void;
    setError: (s: string | null) => void;
}

export const useSnapbotSessionStore = create<SnapbotSessionState>((set) => ({
    session: null,
    submissions: [],
    addState: {},
    preExistingIds: new Set(),
    initializing: true,
    starting: false,
    ending: false,
    error: null,
    setSession: (session) => set({ session }),
    setSubmissions: (submissions) => set({ submissions }),
    patchSubmission: (id, patch) =>
        set((s) => ({
            submissions: s.submissions.map((sub) =>
                sub.submission_id === id ? { ...sub, ...patch } : sub
            ),
        })),
    setAddItemState: (id, state) =>
        set((s) => ({ addState: { ...s.addState, [id]: state } })),
    setPreExistingIds: (ids) => set({ preExistingIds: ids }),
    setInitializing: (b) => set({ initializing: b }),
    setStarting: (b) => set({ starting: b }),
    setEnding: (b) => set({ ending: b }),
    setError: (s) => set({ error: s }),
}));
