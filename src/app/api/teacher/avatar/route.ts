/**
 * Teacher profile photo upload (batch 4C, F6).
 *
 * The avatar logic is now role-agnostic and lives in the shared route at
 * `src/app/api/profile/avatar/route.ts`. This endpoint is kept only for
 * backward compatibility (anything still POSTing here keeps working) and
 * forwards verbatim to the shared handlers. The teacher UI now points at the
 * shared route directly.
 */
export { POST, DELETE, dynamic } from "@/app/api/profile/avatar/route";
