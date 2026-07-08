import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler with uniform error handling so throwing
 * ApiError / ZodError anywhere in the handler produces a clean
 * JSON error response instead of a 500.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.message);
      if (err instanceof ZodError) {
        return jsonError(422, err.issues.map((i) => i.message).join("; "));
      }
      console.error("[api] unhandled error:", err);
      return jsonError(500, "Internal server error");
    }
  };
}
