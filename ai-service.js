export class AIService {
  constructor() {
    this.session = null;
    this.status = "idle"; // 'idle', 'downloading', 'ready', 'unsupported'
  }

  // 1. Lifecycle Management: Check and Prepare
  async initialize(onProgress) {
    if (!window.ai?.languageModel) {
      this.status = "unsupported";
      throw new Error("Built-in AI not supported in this browser.");
    }

    const capabilities = await window.ai.languageModel.capabilities();
    const availability = capabilities.available;

    if (availability === "no") {
      this.status = "unsupported";
      return;
    }

    if (availability === "after-download") {
      this.status = "downloading";
      this.session = await window.ai.languageModel.create({
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress?.(percent);
          });
        },
      });
    } else {
      this.session = await window.ai.languageModel.create();
    }

    this.status = "ready";
  }

  // 2. Privacy Guard: Local PII Redaction
  #redactPII(text) {
    // Senior approach: Use regex/local libraries to mask PII *before* inference
    const patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    };
    return text
      .replace(patterns.email, "[EMAIL]")
      .replace(patterns.phone, "[PHONE]");
  }

  // 3. Graceful Fallback Logic
  async prompt(userInput) {
    const safeInput = this.#redactPII(userInput);

    try {
      if (this.status !== "ready") throw new Error("Local model not ready");

      // Attempt local inference first
      return await this.session.prompt(safeInput);
    } catch (err) {
      console.warn(
        "Local AI failed or unavailable, falling back to server...",
        err
      );
      return await this.#fallbackToServer(safeInput);
    }
  }

  async #fallbackToServer(prompt) {
    const response = await fetch("/api/ai/fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data.response;
  }
}
