/**
 * Audit wrapper. New code should call `audit.mutation()` rather than
 * raw `prisma.auditLog.create()` or the lower-level `logAudit()`.
 *
 * `audit-base.ts` holds the original `logAudit()` implementation. This
 * file re-exports it AND provides a higher-level helper for the common
 * "actor mutated entity" case.
 */
export { logAudit } from "./audit-base";
import { logAudit } from "./audit-base";

export const audit = {
  log: logAudit,

  /**
   * Record an actor's mutation of an entity.
   *
   *   action   — verb in past tense, eg "CALENDAR_EVENT_CREATED"
   *   entity   — model name,                eg "CalendarEvent"
   *   entityId — row id
   *   diff     — optional patch object, recorded as metadata
   */
  mutation(
    actorId: string | null | undefined,
    action: string,
    entity: string,
    entityId: string,
    diff?: Record<string, unknown>
  ) {
    return logAudit({
      userId: actorId ?? null,
      action,
      entity,
      entityId,
      metadata: diff ?? null,
    });
  },
};
