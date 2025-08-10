import { error } from "@sveltejs/kit";
import fs from "fs";
import path from "path";

export async function GET({ params, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    throw error(401, "Unauthorized");
  }

  const audioPath = params.path;
  const fullPath = path.join(process.cwd(), "data", audioPath);

  // Security check - ensure path doesn't escape data directory
  const normalizedPath = path.normalize(fullPath);
  const dataDir = path.join(process.cwd(), "data");

  if (!normalizedPath.startsWith(dataDir)) {
    throw error(403, "Forbidden");
  }

  if (!fs.existsSync(fullPath)) {
    throw error(404, "Audio file not found");
  }

  const stat = fs.statSync(fullPath);
  const stream = fs.createReadStream(fullPath);

  return new Response(stream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
