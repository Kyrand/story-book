import { json } from "@sveltejs/kit";

/**
 * Handle forwarded console logs from the client
 * @param {import('./$types').RequestEvent} event
 */
export async function POST({ request }) {
  try {
    const body = await request.json();

    // Extract log information with safer handling
    const { level, args, timestamp, url, caller } = body;

    // Validate required fields
    if (!level || !args) {
      console.error("❌ Invalid client log format:", {
        level,
        args: !!args,
        timestamp,
        url,
      });
      return json({ error: "Invalid log format" }, { status: 400 });
    }

    // Format the log message safely
    const logMessage = Array.isArray(args) ? args.join(" ") : String(args);
    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    let urlInfo = "";

    if (url) {
      try {
        urlInfo = ` [${new URL(url).pathname}]`;
      } catch (urlError) {
        urlInfo = ` [${url}]`; // fallback for invalid URLs
      }
    }

    // Add caller info if available
    let callerInfo = "";
    if (caller) {
      // Extract just the file path and line number from the stack trace line
      //const match = caller.match(/\((.*?)\)/) || caller.match(/at\s+(.*)$/);
      //if (match && match[1]) {
      //	callerInfo = ` ${match[1]}`;
      //}
      callerInfo = `(${caller.file}:${caller.line})`;
    }

    // Forward to server console with appropriate level
    const prefix = `🌐 [CLIENT ${level.toUpperCase()}] ${timeStr}${urlInfo}${callerInfo}:`;

    switch (level.toLowerCase()) {
      case "error":
        console.error(prefix, logMessage);
        break;
      case "warn":
        console.warn(prefix, logMessage);
        break;
      case "info":
        console.info(prefix, logMessage);
        break;
      case "debug":
        console.debug(prefix, logMessage);
        break;
      case "log":
      default:
        console.log(prefix, logMessage);
        break;
    }

    return json({ success: true });
  } catch (error) {
    console.error("❌ Failed to process client log - Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return json({ error: "Failed to process log" }, { status: 500 });
  }
}

/**
 * Handle GET requests for testing
 */
export async function GET() {
  return json({
    message: "Console log forwarding endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
