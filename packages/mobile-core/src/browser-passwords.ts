import type { PasswordStore } from "./remembered-login";

export interface BrowserPasswordEnvironment {
  secure: boolean;
  PasswordCredential?: new (value: { id: string; password: string }) => unknown;
  credentials?: {
    get(options: {
      password: true;
      mediation: "silent";
      signal: AbortSignal;
    }): Promise<unknown>;
    store(credential: unknown): Promise<unknown>;
    preventSilentAccess?(): Promise<void>;
  };
}

/** Use the browser's password manager; never invent a web-storage password vault. */
export function createBrowserPasswordStore(
  environment?: BrowserPasswordEnvironment,
): PasswordStore {
  const available = () =>
    Boolean(
      environment?.secure &&
        environment.PasswordCredential &&
        environment.credentials?.get &&
        environment.credentials.store,
    );
  return {
    available,
    async read() {
      if (!available()) return null;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          environment!.credentials!.get({
            password: true,
            mediation: "silent",
            signal: controller.signal,
          }),
          new Promise<null>((resolve) => {
            timer = setTimeout(() => {
              controller.abort();
              resolve(null);
            }, 2000);
          }),
        ]);
        if (!result || typeof result !== "object") return null;
        const credential = result as Record<string, unknown>;
        return credential.type === "password" &&
          typeof credential.id === "string" &&
          typeof credential.password === "string"
          ? { identifier: credential.id, password: credential.password }
          : null;
      } catch {
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    async write(value) {
      if (!available()) return false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const credential = new environment!.PasswordCredential!({
          id: value.identifier,
          password: value.password,
        });
        return await Promise.race([
          environment!.credentials!.store(credential).then(() => true),
          new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), 4000);
          }),
        ]);
      } catch {
        return false;
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    async remove() {
      // The app can stop silent retrieval, but the user's saved browser entry remains under their control.
      await environment?.credentials
        ?.preventSilentAccess?.()
        .catch(() => undefined);
    },
  };
}
