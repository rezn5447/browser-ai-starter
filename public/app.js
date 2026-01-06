// Major Principle: Local-first PII scrubbing
function scrubPII(text) {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN-REDACTED]")
    .replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,}\b/g, "[EMAIL-REDACTED]");
}

async function runInference(userInput) {
  const safeInput = scrubPII(userInput);

  // 1. Lifecycle Check
  if (
    window.ai &&
    (await window.ai.languageModel.capabilities()).available !== "no"
  ) {
    try {
      const session = await window.ai.languageModel.create();
      const result = await session.prompt(safeInput);
      session.destroy(); // Free up memory immediately
      return result;
    } catch (e) {
      console.error("Local AI failed, falling back...", e);
    }
  }

  // 2. Cloud Fallback
  const response = await fetch("/api/fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: safeInput }),
  });
  const data = await response.json();
  return data.text;
}
