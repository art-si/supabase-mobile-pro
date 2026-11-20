/** One explicit guest action, held only by the originating page. No credentials or persistence. */
export function createLoginReturnIntent<T>(
  options: { now?: () => number; lifetimeMs?: number } = {},
) {
  const now = options.now ?? Date.now;
  const lifetime = options.lifetimeMs ?? 10 * 60 * 1000;
  let pending: { value: T; expires: number; user: string } | undefined;
  return {
    begin(value: T) {
      if (pending && pending.expires > now()) return false;
      pending = { value, expires: now() + lifetime, user: "" };
      return true;
    },
    observeUser(user: string) {
      if (!pending) return;
      // Once a login succeeds, logout or switching identities cancels its action.
      if (pending.expires <= now() || (pending.user && pending.user !== user))
        pending = undefined;
      else if (user) pending.user = user;
    },
    take(user: string): T | undefined {
      const action = pending;
      pending = undefined;
      if (
        !action ||
        !user ||
        action.expires <= now() ||
        (action.user && action.user !== user)
      )
        return;
      return action.value;
    },
    cancel() {
      pending = undefined;
    },
  };
}
