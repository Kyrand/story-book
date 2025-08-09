export class ConsoleWrapper {
  constructor() {
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };
    this.initialized = false;
    this.init();
  }

  getCallerInfo(skipFrames = 3) {
    try {
      const stack = new Error().stack;
      const lines = stack.split("\n");

      for (let i = skipFrames; i < lines.length; i++) {
        const line = lines[i];
        const match =
          line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/) ||
          line.match(/^(.*)@(.+):(\d+):(\d+)$/);

        //if (match && !this.isInternalCall(match[2] || match[1])) {
        if (1) {
          //match) {
          return {
            function: match[1] || "anonymous",
            file: this.cleanFileName(match[2] || match[1]),
            line: parseInt(match[3]),
            column: parseInt(match[4]),
            fullLine: line.trim(),
          };
        }
      }
    } catch (e) {
      // Fallback if stack parsing fails
    }

    return null;
  }

  isInternalCall(location) {
    return (
      location &&
      (location.includes("console-wrapper") ||
        location.includes("chrome-extension://") ||
        location.includes("moz-extension://"))
    );
  }

  cleanFileName(file) {
    if (!file) return "unknown";

    // Remove common prefixes
    return file
      .replace(/^.*\//, "") // Keep only filename
      .replace(/\?.*$/, ""); // Remove query parameters
  }

  serializeArg2(arg) {
    // Convert objects to string for transmission
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }

  async sendToBackend(level, args, callerInfo) {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          args: args.map((arg) => this.serializeArg2(arg)),
          timestamp: Date.now(),
          caller: callerInfo,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      // Use original console to avoid infinite loops
      this.originalConsole.error("Failed to send log to backend:", error);
    }
  }

  serializeArg(arg) {
    try {
      if (typeof arg === "string") return arg;
      if (typeof arg === "object" && arg !== null) {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    } catch (e) {
      return "[Circular or Non-serializable]";
    }
  }

  createWrapper(method) {
    return (..._args) => {
      const callerInfo = this.getCallerInfo();

      // Send to backend (non-blocking)
      const args = [..._args, `(${callerInfo?.file}:${callerInfo?.line})`];
      this.sendToBackend(method, args, callerInfo);
      // Call original console method
      this.originalConsole[method].apply(console, args);
    };
  }

  init() {
    if (typeof window === "undefined" || this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.endpoint = "/api/debug/client-logs";
    Object.keys(this.originalConsole).forEach((method) => {
      console[method] = this.createWrapper(method);
    });
    // Capture uncaught errors

    window.addEventListener("error", (event) => {
      const errorInfo = [
        `Uncaught Error: ${event.error?.message || event.message}`,
        `\n  at ${event.filename}:${event.lineno}:${event.colno}`,
        event.error?.stack ? `\nStack:\n${event.error.stack}` : "",
      ];

      const callerInfo = this.getCallerInfo();
      this.sendToBackend("error", errorInfo, callerInfo);
    });

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      const errorInfo = [
        `Uncaught (in promise): ${event.reason}`,
        event.reason?.stack ? `\nStack:\n${event.reason.stack}` : "",
      ];
      const callerInfo = this.getCallerInfo();
      this.sendToBackend("error", errorInfo, callerInfo);
    });

    window.addEventListener("message", (event) => {
      console["log"]("Received message from parent:", event.data);
    });
    console["log"]("Console wrapper initialized");
  }

  restore() {
    Object.keys(this.originalConsole).forEach((method) => {
      console[method] = this.originalConsole[method];
    });
  }
}

// Initialize the wrapper
//const consoleWrapper = new ConsoleWrapper();
