/** Serialize credential I/O so an older token write cannot finish after logout. */
export interface CredentialAdapter {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

export function createCredentialStore(adapter: CredentialAdapter) {
  let pending: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation, operation);
    pending = result.catch(() => undefined);
    return result;
  }
  return {
    read: () => enqueue(() => adapter.read()),
    write: (value: string) =>
      enqueue(async () => {
        try {
          await adapter.write(value);
        } catch (error) {
          // A failed account switch must not leave the previous account saved.
          await adapter.remove().catch(() => undefined);
          throw error;
        }
      }),
    remove: () => enqueue(() => adapter.remove()),
  };
}
