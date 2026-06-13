import { toNextJsHandler } from "better-auth/next-js";

// Lazily import auth to avoid evaluating env at build time.
// betterAuth() accesses env properties at module-evaluation time; wrapping
// the import in functions defers that until the first real request.
async function getHandler() {
  const { auth } = await import("@/lib/auth");
  return toNextJsHandler(auth);
}

export async function GET(request: Request) {
  const handler = await getHandler();
  return handler.GET(request);
}

export async function POST(request: Request) {
  const handler = await getHandler();
  return handler.POST(request);
}
