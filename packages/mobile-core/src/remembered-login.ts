export interface LoginPreference {
  version: 1;
  identifier: string;
  owner: string;
}
export interface LoginSecret {
  identifier: string;
  password: string;
}
export interface PasswordStore {
  available(): boolean;
  read(): Promise<LoginSecret | null>;
  write(value: LoginSecret): Promise<boolean>;
  remove(): Promise<void>;
}
export interface LoginPreferenceStore {
  read(): unknown;
  write(value: LoginPreference): void;
  remove(): void;
}

/** Preferences contain identity only; passwords belong to the supplied OS/browser store. */
export function createRememberedLogin(options: {
  preferences: LoginPreferenceStore;
  passwords: PasswordStore;
  normalizeIdentifier(value: string): string;
}) {
  let revision = 0;
  let pending: Promise<unknown> = Promise.resolve();
  const queue = <T>(task: () => Promise<T>) => {
    const result = pending.then(task, task);
    pending = result.catch(() => undefined);
    return result;
  };
  function preference(): LoginPreference | null {
    try {
      const raw = options.preferences.read();
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Record<string, unknown>;
      if (
        item.version !== 1 ||
        typeof item.identifier !== "string" ||
        item.identifier.length > 64 ||
        typeof item.owner !== "string" ||
        !item.owner ||
        item.owner.length > 128
      )
        return null;
      return {
        version: 1,
        owner: item.owner,
        identifier: options.normalizeIdentifier(item.identifier),
      };
    } catch {
      return null;
    }
  }
  async function clear() {
    let failed = false;
    try {
      options.preferences.remove();
    } catch {
      failed = true;
    }
    try {
      await options.passwords.remove();
    } catch {
      failed = true;
    }
    if (failed) throw new Error("Remembered login could not be cleared");
  }
  function forget() {
    revision++;
    // Opt-out stops automatic use immediately, even while an older OS write is pending.
    try {
      options.preferences.remove();
    } catch {
      /* retried inside serialized clear */
    }
    return queue(clear);
  }
  return {
    preference,
    canSavePassword: () => options.passwords.available(),
    async load() {
      const current = revision;
      return queue(async () => {
        const item = preference();
        if (!item || current !== revision) return null;
        let password = "";
        try {
          const secret = options.passwords.available()
            ? await options.passwords.read()
            : null;
          if (
            secret &&
            options.normalizeIdentifier(secret.identifier) ===
              item.identifier &&
            typeof secret.password === "string" &&
            secret.password.length > 0 &&
            secret.password.length <= 128
          )
            password = secret.password;
        } catch {
          /* Locked devices and declined browser access preserve the remembered account. */
        }
        return current === revision ? { ...item, password } : null;
      });
    },
    /** Call only after authentication succeeds. isCurrent rejects late account/page results. */
    save(value: LoginSecret & { owner: string }, isCurrent = () => true) {
      const current = ++revision;
      return queue(async () => {
        const valid = () => current === revision && isCurrent();
        if (!valid()) return { saved: false, passwordSaved: false };
        const identifier = options.normalizeIdentifier(value.identifier);
        if (
          !value.owner ||
          value.owner.length > 128 ||
          !value.password ||
          value.password.length > 128
        )
          throw new Error("Invalid remembered login");
        try {
          const passwordSaved = options.passwords.available()
            ? await options.passwords.write({
                identifier,
                password: value.password,
              })
            : false;
          if (!valid()) {
            await clear();
            return { saved: false, passwordSaved: false };
          }
          options.preferences.write({
            version: 1,
            identifier,
            owner: value.owner,
          });
          return { saved: true, passwordSaved };
        } catch {
          await clear().catch(() => undefined);
          throw new Error("Remembered login could not be saved");
        }
      });
    },
    forget,
    forgetOwner(owner: string) {
      const item = preference();
      return !item || item.owner === owner ? forget() : Promise.resolve();
    },
    forgetOtherOwners(owner: string) {
      const item = preference();
      return item && item.owner !== owner ? forget() : Promise.resolve();
    },
  };
}
