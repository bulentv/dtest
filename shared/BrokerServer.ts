import { Message, MessageType } from "./protocol.ts";

type Client = {
  id: string;
  socket: WebSocket;
}

type ModuleRecord = {
  name: string;
  module: unknown;
}

export class BrokerServer {
  clients: Map<WebSocket, Client> = new Map();
  moduleRegistry: Map<string, ModuleRecord> = new Map();

  constructor() {
    this.onSocketOpen = this.onSocketOpen.bind(this);
    this.onSocketMessage = this.onSocketMessage.bind(this);
    this.onSocketClose = this.onSocketClose.bind(this);
    this.onSocketError = this.onSocketError.bind(this);
    console.log('BrokerServer constructed');
  }

  listen() {
    Deno.serve({ hostname: '127.0.0.1', port: 8000 }, (req) => {
      if (req.headers.get("upgrade") != "websocket") {
        return new Response(null, { status: 501 });
      }

      return this.upgrade(req);
    });
  }

  private sendMessage(socket: WebSocket, message: Message) {
    if (this.clients.has(socket) && socket.readyState === WebSocket.OPEN) {
      message.ts = Date.now();
      socket.send(JSON.stringify(message));
    }
  }

  private onRequestMessage(message: Message, client: Client) {
    const response: Message = {
      id: message.id,
      type: MessageType.Response,
      target: message.target,
      requestId: message.id,
      payload: null,
      ts: 0,
    };

    switch (message.method) {
      case 'on':
      case 'addEventListener': {
        console.log('Adding event listener:', message.target, message.payload);
        break;
      }

      case 'off':
      case 'removeEventListener': {
        console.log('Removing event listener:', message.target, message.payload);
        break;
      }

      default: break;
    }

    const moduleRecord = this.moduleRegistry.get(message.target);

    if (!moduleRecord) {
      response.payload = {
        error: `Module ${message.target} not found.`,
      };

      this.sendMessage(client.socket, response);
      return;
    }

    const { module } = moduleRecord;
    
    const method = (module as any)[message.method!];
    
    if (!module || !method) {
      response.payload = {
        error: `${[!module ? `Module ${message.target}` : `Method ${message.target}.${message.method}`]} not found.`,
      };

      this.sendMessage(client.socket, response);
      return;
    }

    method.call(module, message.payload)
      .then((result: unknown) => {
        response.payload = result;
      })
      .catch((error: Error) => {
        response.payload = error.message;
      })
      .finally(() => {
        this.sendMessage(client.socket, response);
      });
  }

  private onSocketOpen(_event: Event) {
  }

  private onSocketClose(event: CloseEvent) {
    console.log('Socket closed:', event);
  }

  private onSocketError(event: Event) {
    console.log('Socket error:', event.type);
  }

  private onSocketMessage(event: MessageEvent) {
    const socket = event.target as WebSocket; 
    const client = this.clients.get(socket);

    if (!client) {
      console.error('Client not found for socket:', socket);
      socket.close();
      return;
    }

    const message: Message = JSON.parse(event.data);

    switch (message.type) {
      case MessageType.Request: {
        this.onRequestMessage(message, client);
        break;
      }
      
      case MessageType.Response: {
        // this.onResponseMessage(message, client);
        console.warn('Response message not implemented');
        break;
      }

      case MessageType.Event: {
        // this.onEventMessage(message, client);
        console.warn('Event message not implemented');
        break;
      }

      default: {
        console.error('Unknown message type:', message.type);
      }
    }
  }

  upgrade(req: Request) {
    const { socket, response } = Deno.upgradeWebSocket(req, { });

    const client: Client = this.clients.get(socket) || { id: '', socket };
    this.clients.set(socket, client);

    socket.addEventListener('message', this.onSocketMessage);
    socket.addEventListener('open', this.onSocketOpen);
    socket.addEventListener('close', this.onSocketClose);
    socket.addEventListener('error', this.onSocketError);

    return response;
  }
}