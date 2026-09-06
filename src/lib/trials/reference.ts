/**
 * The short request number a family quotes on WhatsApp.
 *
 * A trial request is identified internally by a uuid, which nobody can read
 * out over a phone or find again in a chat thread. The first block of the
 * uuid, upper-cased, is short enough to say aloud and still unique in
 * practice — the same convention the checkout hand-off uses for orders, so
 * the two look like they came from one system.
 *
 * Kept in its own module because both the API route (which returns it) and
 * the admin list (which displays it) must derive it identically; two copies
 * of this rule would eventually disagree, and a reference that does not match
 * the one the customer was given is worse than no reference at all.
 */
export function trialReference(id: string): string {
  return (id.split("-")[0] ?? id).toUpperCase();
}
