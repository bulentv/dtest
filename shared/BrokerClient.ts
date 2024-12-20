import { Message, MessageType } from "./protocol.ts";
import { v4 as uuidv4 } from 'npm:uuid';

export class BrokerClient {
  [key: string]: unknown;
  private moduleProxies: Map<string, BrokerClient> = new Map();
  private socket: WebSocket | null = null;
  private requests: Map<string, (value: unknown) => void> = new Map();

  constructor() {
    this.onConnect = this.onConnect.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);

    return new Proxy(this, {
      get: (_target, prop, _receiver) => {
        if (typeof prop === "string") {
          if (this[prop]) {
            return this[prop];
          }

          const moduleName = prop;

          if (this.moduleProxies.has(moduleName)) {
            return this.moduleProxies.get(moduleName);
          }

          const moduleProxy = this.createModuleProxy(moduleName);

          if (!moduleProxy) {
            return;
          }

          this.moduleProxies.set(moduleName, moduleProxy);
          return moduleProxy;
        }
      },
    });
  }

  private createModuleProxy(moduleName: string): BrokerClient | undefined {
    return new Proxy(this, {
      get: (_target, methodName, _receiver) => {
        if (typeof methodName !== "string") {
          return;
        }

        return (payload: unknown) =>
          this.callRemoteFunction(moduleName, methodName, payload);
      },
    });
  }

  private callRemoteFunction(
    moduleName: string,
    methodName: string,
    payload: unknown,
  ): Promise<unknown> {
    const message: Message = {
      id: uuidv4(),
      type: MessageType.Request,
      target: moduleName,
      method: methodName,
      payload: payload,
      ts: Date.now(),
    };

    return new Promise((resolve) => {
      this.socket!.send(JSON.stringify(message));
      this.requests.set(message.id, resolve);
    });
  }

  private onConnect<T>(event: Event): void {
    console.log("connected to server!");
  }

  private onMessage(event: MessageEvent): void {
    const message: Message = JSON.parse(event.data);

    switch (message.type) {
      case MessageType.Event: {
        console.log('Received event:', message);
        this.modules = message.payload as string[];
        break;
      }

      case MessageType.Response: {
        const request = this.requests.get(message.requestId!);

        if (!request) {
          break;
        }

        request(message.payload);
        this.requests.delete(message.requestId!);

        break;
      }

      default: {
        console.log('Unknown message type:', message.type);
      }
    }
  }

  private onError(event: Event): void {
    console.error("error:", event.type);
  }

  private onClose(event: CloseEvent): void {
    console.log("disconnected from server!");

    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  connect(url: string = "ws://127.0.0.1:8000"): void {
    this.socket = new WebSocket(url);

    this.socket.addEventListener("open", this.onConnect);
    this.socket.addEventListener("message", this.onMessage);
    this.socket.addEventListener("close", this.onClose);
    this.socket.addEventListener("error", this.onError);
  }
}