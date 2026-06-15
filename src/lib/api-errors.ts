import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorResponse = {
  error: string;
};

export function apiError(message: string, status: 400 | 404 | 500) {
  return NextResponse.json({ error: message } satisfies ApiErrorResponse, {
    status,
  });
}

export function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}
