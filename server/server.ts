import { BrokerServer } from "../shared/BrokerServer.ts";

class Server {
  brokerServer: BrokerServer = new BrokerServer();
  
  run() {
    this.brokerServer.listen();
  }
}

new Server().run();