import type { _ClientImpl } from './client';

type SubscriptionState = {
  client: _ClientImpl;
  debuggableClients: _ClientImpl[];
};
type SubscribeCallback = (arg: SubscriptionState) => void;
type UnsubscribeCallback = () => void;

/**
 * Class to manage boardgame.io clients.
 */
export class ClientManager {
  private currentClient: _ClientImpl | null;
  private clients: Map<_ClientImpl, _ClientImpl>;
  private subscribers: Map<symbol, SubscribeCallback>;

  constructor() {
    this.currentClient = null;
    this.clients = new Map();
    this.subscribers = new Map();
  }

  register(client: _ClientImpl): void {
    this.clients.set(client, client);
    if (!this.currentClient) this.currentClient = client;
    this.notifySubscribers();
  }

  unregister(client: _ClientImpl): void {
    this.clients.delete(client);
    if (this.currentClient === client) {
      this.currentClient = this.clients.size
        ? [...this.clients.values()][0]
        : null;
    }
    this.notifySubscribers();
  }

  subscribe(callback: SubscribeCallback): UnsubscribeCallback {
    const id = Symbol();
    this.subscribers.set(id, callback);
    callback(this.getState());
    return () => {
      this.subscribers.delete(id);
    };
  }

  switchPlayerID(playerID: string): void {
    if (this.currentClient.multiplayer) {
      for (const [client] of this.clients) {
        if (
          client.playerID === playerID &&
          client.multiplayer === this.currentClient.multiplayer
        ) {
          this.switchToClient(client);
          return;
        }
      }
    }
    this.currentClient.updatePlayerID(playerID);
    this.notifySubscribers();
  }

  switchToClient(client: _ClientImpl): void {
    if (client === this.currentClient) return;
    this.currentClient = client;
    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    const arg = this.getState();
    this.subscribers.forEach((cb) => cb(arg));
  }

  private getState(): SubscriptionState {
    return {
      client: this.currentClient,
      debuggableClients: [...this.clients.values()],
    };
  }
}
