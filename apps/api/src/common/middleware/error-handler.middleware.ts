import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
};
