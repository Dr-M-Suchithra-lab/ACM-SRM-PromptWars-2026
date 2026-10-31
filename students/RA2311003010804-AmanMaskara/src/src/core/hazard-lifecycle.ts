// ─── Hazard lifecycle: age, deadlines, escalation and actions ───────
// Pure functions over a hazard record. `now` is always passed in. Every change is written
// to the hazard's timeline so workers and managers see the same history.

import {
  CONFIRM_WINDOW_MS,
  DISMISS_REASONS,
  DUE_SOON_SHARE,
  RESOLUTION_DEADLINE_MS,
  type DismissReason,
} from "@/config/hazard-sla";
import { canTransition } from "./hazard-rules";
import type { Hazard, HazardTimelineEntry } from "./types";

export type DeadlineState = "on_track" | "due_soon" | "overdue";

export function isOpen(hazard: Pick<Hazard, "status" | "mergedInto">): boolean {
  return !hazard.mergedInto && (hazard.status === "received" || hazard.status === "in_progress");
}

/** When the resolution clock started: the last time the report was received or reopened. */
export function clockStart(hazard: Pick<Hazard, "timeline" | "createdAt">): Date {
  for (let i = hazard.timeline.length - 1; i >= 0; i--) {
    const entry = hazard.timeline[i];
    if (entry.status === "received" || entry.status === "reopened") return entry.at;
  }
  return hazard.createdAt;
}

/** Milliseconds since the clock started. */
export function getHazardAge(hazard: Pick<Hazard, "timeline" | "createdAt">, now: Date): number {
  return Math.max(0, now.getTime() - clockStart(hazard).getTime());
}

export function deadlineFor(hazard: Pick<Hazard, "severity">): number {
  return RESOLUTION_DEADLINE_MS[hazard.severity];
}

/** Open and past its deadline. Exactly at the deadline is still on time. */
export function isOverdue(hazard: Hazard, now: Date): boolean {
  return isOpen(hazard) && getHazardAge(hazard, now) > deadlineFor(hazard);
}

export function deadlineState(hazard: Hazard, now: Date): DeadlineState {
  const age = getHazardAge(hazard, now);
  const deadline = deadlineFor(hazard);
  if (age > deadline) return "overdue";
  return age >= deadline * DUE_SOON_SHARE ? "due_soon" : "on_track";
}

/**
 * The escalation level an open hazard should be at now, or null when it is already there.
 * Every fully missed deadline period moves it one role up the chain, capped at the top.
 */
export function nextEscalationLevel(hazard: Hazard, now: Date, chainLength: number): number | null {
  if (!isOpen(hazard)) return null;
  const age = getHazardAge(hazard, now);
  const deadline = deadlineFor(hazard);
  const missed = age > deadline ? Math.floor((age - 1) / deadline) : 0;
  const target = Math.min(missed, chainLength);
  return target > hazard.escalationLevel ? target : null;
}

export type HazardAction =
  | { type: "start" }
  | { type: "fix"; note: string; photo?: string }
  | { type: "dismiss"; reason: string; note?: string }
  | { type: "reopen" }
  | { type: "confirm"; fixed: boolean };

export type ActionError = "invalid_transition" | "reason_required" | "note_required" | "not_awaiting_confirmation";
export type ActionResult = { ok: true; hazard: Hazard } | { ok: false; error: ActionError };

export const MIN_NOTE_LENGTH = 3;

const hasNote = (note: string | undefined): note is string => (note?.trim().length ?? 0) >= MIN_NOTE_LENGTH;
const isDismissReason = (reason: string): reason is DismissReason =>
  (DISMISS_REASONS as readonly string[]).includes(reason);

function withEvent(hazard: Hazard, entry: HazardTimelineEntry, changes: Partial<Hazard>): Hazard {
  return { ...hazard, ...changes, timeline: [...hazard.timeline, entry] };
}

/** Apply one management or worker action. `by` is an admin uid, or undefined for the worker. */
export function applyHazardAction(hazard: Hazard, action: HazardAction, now: Date, by?: string): ActionResult {
  switch (action.type) {
    case "start":
      if (!canTransition(hazard.status, "in_progress")) return { ok: false, error: "invalid_transition" };
      return {
        ok: true,
        hazard: withEvent(hazard, { status: "in_progress", at: now, by }, { status: "in_progress", assigneeUid: by }),
      };

    case "fix": {
      if (!canTransition(hazard.status, "fixed")) return { ok: false, error: "invalid_transition" };
      if (!hasNote(action.note)) return { ok: false, error: "note_required" };
      const note = action.note.trim();
      return {
        ok: true,
        hazard: withEvent(
          hazard,
          { status: "fixed", at: now, by, note },
          { status: "fixed", fixNote: note, fixPhotoDataUrl: action.photo, confirmation: "pending" },
        ),
      };
    }

    case "dismiss": {
      if (!canTransition(hazard.status, "dismissed")) return { ok: false, error: "invalid_transition" };
      if (!isDismissReason(action.reason)) return { ok: false, error: "reason_required" };
      if (action.reason === "other" && !hasNote(action.note)) return { ok: false, error: "note_required" };
      const note = action.note?.trim() || undefined;
      return {
        ok: true,
        hazard: withEvent(
          hazard,
          { status: "dismissed", at: now, by, note: note ?? action.reason },
          { status: "dismissed", dismissReason: action.reason, dismissNote: note },
        ),
      };
    }

    case "reopen":
      if (hazard.status !== "dismissed") return { ok: false, error: "invalid_transition" };
      return { ok: true, hazard: reopened(hazard, now, by) };

    case "confirm":
      if (hazard.status !== "fixed" || hazard.confirmation !== "pending")
        return { ok: false, error: "not_awaiting_confirmation" };
      if (action.fixed) {
        return { ok: true, hazard: withEvent(hazard, { status: "confirmed", at: now }, { confirmation: "confirmed" }) };
      }
      return { ok: true, hazard: reopened(hazard, now, undefined, "not_fixed") };
  }
}

/** Back to "received": the clock and the escalation restart. */
function reopened(hazard: Hazard, now: Date, by?: string, note?: string): Hazard {
  return withEvent(
    hazard,
    { status: "reopened", at: now, by, note },
    {
      status: "received",
      escalationLevel: 0,
      confirmation: undefined,
      dismissReason: undefined,
      dismissNote: undefined,
    },
  );
}

/**
 * Time-based changes: escalate a hazard that missed its deadline, and close a fixed one the
 * reporter never answered about. Returns null when nothing changes (so callers skip the write).
 */
export function sweepHazard(hazard: Hazard, now: Date, chainLength: number): Hazard | null {
  const level = nextEscalationLevel(hazard, now, chainLength);
  if (level !== null) {
    return withEvent(hazard, { status: "escalated", at: now, level }, { escalationLevel: level });
  }
  if (hazard.status === "fixed" && hazard.confirmation === "pending") {
    const fixedAt = [...hazard.timeline].reverse().find((e) => e.status === "fixed")?.at ?? now;
    if (now.getTime() - fixedAt.getTime() > CONFIRM_WINDOW_MS) {
      return withEvent(hazard, { status: "auto_closed", at: now }, { confirmation: "auto_closed" });
    }
  }
  return null;
}
