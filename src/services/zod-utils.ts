import { ZodError } from "zod";

export function zodMessage(error: ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}

export { ZodError };
