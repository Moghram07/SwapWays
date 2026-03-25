import { NextResponse } from "next/server";
import { forbiddenResponse, getCurrentUserAccess, unauthorizedResponse } from "@/lib/admin";
import {
  listFeedback,
  updateFeedback,
  type FeedbackPriority,
  type FeedbackStatus,
  type FeedbackType,
} from "@/repositories/feedbackRepository";

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

const ALLOWED_STATUSES: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];
const ALLOWED_PRIORITIES: FeedbackPriority[] = ["LOW", "NORMAL", "HIGH"];
const ALLOWED_TYPES: FeedbackType[] = ["REQUEST", "QUESTION", "SUGGESTION"];

function isMissingRelationError(e: unknown, relationName: string) {
  if (!(e instanceof Error)) return false;
  const text = e.message.toLowerCase();
  return text.includes("42p01") && text.includes(relationName.toLowerCase());
}

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.session?.user?.id) return unauthorizedResponse();
  if (!access.isAdmin) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const statusRaw = (searchParams.get("status") || "").toUpperCase();
  const typeRaw = (searchParams.get("type") || "").toUpperCase();
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "25")));
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const offset = (page - 1) * limit;

  const status = ALLOWED_STATUSES.includes(statusRaw as FeedbackStatus)
    ? (statusRaw as FeedbackStatus)
    : undefined;
  const type = ALLOWED_TYPES.includes(typeRaw as FeedbackType) ? (typeRaw as FeedbackType) : undefined;

  try {
    const result = await listFeedback({ status, type, q, limit, offset });
    return json({
      items: result.items,
      pagination: { total: result.total, page, limit, pages: Math.max(1, Math.ceil(result.total / limit)) },
    });
  } catch (e) {
    // Allow admin page to load on partially initialized local DBs.
    if (isMissingRelationError(e, "Feedback")) {
      return json({
        items: [],
        pagination: { total: 0, page, limit, pages: 1 },
      });
    }
    return error(e instanceof Error ? e.message : "Failed to load feedback", 500);
  }
}

export async function PATCH(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access.session?.user?.id) return unauthorizedResponse();
  if (!access.isAdmin) return forbiddenResponse();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid JSON body", 400);

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return error("id is required", 400);

  const statusRaw = typeof body.status === "string" ? body.status.trim().toUpperCase() : undefined;
  const priorityRaw = typeof body.priority === "string" ? body.priority.trim().toUpperCase() : undefined;
  const assigneeId =
    body.assigneeId === null ? null : typeof body.assigneeId === "string" ? body.assigneeId.trim() || null : undefined;
  const adminNote =
    body.adminNote === null ? null : typeof body.adminNote === "string" ? body.adminNote.trim() || null : undefined;

  const status = statusRaw && ALLOWED_STATUSES.includes(statusRaw as FeedbackStatus)
    ? (statusRaw as FeedbackStatus)
    : undefined;
  const priority = priorityRaw && ALLOWED_PRIORITIES.includes(priorityRaw as FeedbackPriority)
    ? (priorityRaw as FeedbackPriority)
    : undefined;

  if (!status && !priority && assigneeId === undefined && adminNote === undefined) {
    return error("No valid fields to update", 400);
  }

  try {
    await updateFeedback(id, { status, priority, assigneeId, adminNote });
    return json({ ok: true });
  } catch (e) {
    if (isMissingRelationError(e, "Feedback")) {
      return error("Feedback table is not initialized yet.", 503);
    }
    return error(e instanceof Error ? e.message : "Failed to update feedback", 500);
  }
}
