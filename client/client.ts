import { BrokerClient } from "../shared/BrokerClient.ts";
import { TypedBrokerClient } from "../shared/TypedBrokerClient.ts";

class Client {
  brokerClient = new BrokerClient() as TypedBrokerClient;

  public run() {
    this.brokerClient.connect();

    setTimeout(() => {
      const { core } = this.brokerClient;
      core.greet().then((messages) => {
        console.log(messages);
      });
    }, 1000);
  }
}

new Client().run();