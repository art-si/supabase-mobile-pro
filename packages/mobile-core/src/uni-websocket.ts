/** A browser-shaped transport for SDKs, using an isolated Uni SocketTask (never global sockets). */
export interface MobileSocketTask {
  onOpen(callback: () => void): void;
  onMessage(callback: (event: { data: string | ArrayBuffer }) => void): void;
  onClose(callback: (event: { code?: number; reason?: string }) => void): void;
  onError(callback: () => void): void;
  send(options: {
    data: string | ArrayBuffer;
    success: () => void;
    fail: () => void;
  }): void;
  close(options: { code: number; reason: string; fail: () => void }): void;
}
export type MobileSocketConnect = (options: {
  url: string;
  protocols?: string[];
  success: () => void;
  fail: () => void;
}) => MobileSocketTask;

export function createUniWebSocket(connect: MobileSocketConnect) {
  return class UniWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readonly url: string;
    readonly protocol = "";
    readonly extensions = "";
    readyState = 0;
    binaryType = "arraybuffer";
    bufferedAmount = 0;
    onopen: ((event: Event) => unknown) | null = null;
    onmessage: ((event: MessageEvent) => unknown) | null = null;
    onclose: ((event: CloseEvent) => unknown) | null = null;
    onerror: ((event: Event) => unknown) | null = null;
    private task?: MobileSocketTask;
    private listeners = new Map<string, Set<EventListener>>();

    constructor(address: string | URL, protocols?: string | string[]) {
      this.url = String(address);
      if (!/^wss?:\/\//i.test(this.url))
        throw new Error("WebSocket requires ws or wss");
      // A callback prevents Uni from returning a promisified task. Deliver failures asynchronously
      // so SDKs can attach handlers even when connectSocket fails synchronously.
      const fail = () => {
        void Promise.resolve().then(() => this.failed());
      };
      try {
        this.task = connect({
          url: this.url,
          protocols: typeof protocols === "string" ? [protocols] : protocols,
          success: () => {},
          fail,
        });
        this.task.onOpen(() => {
          if (this.readyState !== this.CONNECTING) {
            this.closeTask(1000, "");
            return;
          }
          this.readyState = this.OPEN;
          this.emit("open", {});
        });
        this.task.onMessage((event) => {
          if (this.readyState === this.OPEN)
            this.emit("message", { data: event.data });
        });
        this.task.onClose((event) =>
          this.finish(event.code || 1006, event.reason || ""),
        );
        this.task.onError(fail);
      } catch {
        fail();
      }
    }
    addEventListener(type: string, listener: EventListener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(listener);
    }
    removeEventListener(type: string, listener: EventListener) {
      this.listeners.get(type)?.delete(listener);
    }
    private emit(type: string, value: object) {
      // Mini programs have no DOM Event constructors. SDKs only require these event fields.
      const event = { type, target: this, ...value } as unknown as Event;
      const handler = this[`on${type}` as "onopen"];
      handler?.call(this, event);
      for (const listener of this.listeners.get(type) || [])
        listener.call(this, event);
    }
    private finish(code: number, reason: string) {
      if (this.readyState === this.CLOSED) return;
      this.readyState = this.CLOSED;
      this.bufferedAmount = 0;
      this.emit("close", { code, reason, wasClean: code === 1000 });
    }
    private failed() {
      if (this.readyState === this.CLOSED) return;
      this.emit("error", {}); // Provider errors may contain URLs/credentials; don't forward them.
      this.finish(1006, "");
      this.closeTask(1000, "");
    }
    private closeTask(code: number, reason: string, fail = () => {}) {
      // Native bridges can throw before invoking their failure callback (e.g. a torn-down task).
      // Keep those provider exceptions, which may contain credentials, out of SDK callbacks.
      try {
        this.task?.close({ code, reason, fail });
      } catch {
        fail();
      }
    }
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      if (this.readyState !== this.OPEN || !this.task)
        throw new Error("WebSocket is not open");
      let value: string | ArrayBuffer;
      if (typeof data === "string" || data instanceof ArrayBuffer) value = data;
      else if (ArrayBuffer.isView(data))
        value = new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength,
        ).slice().buffer;
      else throw new Error("WebSocket accepts strings or ArrayBuffers");
      const size =
        typeof value === "string" ? value.length * 2 : value.byteLength;
      this.bufferedAmount += size;
      try {
        this.task.send({
          data: value,
          success: () => {
            this.bufferedAmount = Math.max(0, this.bufferedAmount - size);
          },
          fail: () => this.failed(),
        });
      } catch {
        this.failed();
      }
    }
    close(code = 1000, reason = "") {
      if (this.readyState >= this.CLOSING) return;
      this.readyState = this.CLOSING;
      if (!this.task) this.finish(code, reason);
      else this.closeTask(code, reason, () => this.finish(1006, ""));
    }
  };
}
