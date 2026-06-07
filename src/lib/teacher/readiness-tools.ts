/**
 * Canonical interactive-tool keys for the teacher readiness check (batch 4C, F4).
 * Shared by the readiness API (validation) and the readiness form (rendering).
 * Labels come from i18n: Readiness.tool_<KEY>.
 */
export const KNOWN_TOOLS = [
  "ZOOM",
  "WORDWALL",
  "KAHOOT",
  "BAMBOOZLE",
  "CANVA",
  "MIRO",
  "QUIZIZZ",
  "GOOGLE_WORKSPACE",
  "WHITEBOARD",
] as const;

export type KnownTool = (typeof KNOWN_TOOLS)[number];
