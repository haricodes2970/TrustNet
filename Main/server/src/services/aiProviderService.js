// Dedicated AI-provider abstraction — the single seam between this
// codebase and any external LLM API. Exactly one entry point,
// generateCompletion(), per instruction.
//
// No real LLM SDK is wired in this phase — no new dependency, no network
// call, no API key. This default implementation is deterministic (echoes
// its own inputs back in a structured way) rather than a mock that merely
// returns a canned string, so callers/tests can verify the full prompt
// (system prompt + context + question) actually reached this boundary.
// Same "most appropriate equivalent without inventing infra" reasoning
// already used for storageService's local-disk default provider and the
// node --test/mongodb-memory-server infrastructure choices. Wiring a real
// provider (OpenAI, Anthropic, etc.) is a follow-up decision — see
// BACKLOG.md for the named options.

async function generateCompletion({ systemPrompt, contextBlock, question }) {
  const questionLine = question ? `\n\nUser question: ${question}` : "";
  return `${systemPrompt}\n\nContext:\n${contextBlock}${questionLine}`;
}

module.exports = {
  generateCompletion,
};
