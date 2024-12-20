import { BrokerClient } from './BrokerClient.ts';
import { CoreApi } from '../server/CoreApi.ts';

export type { CoreApi };

type ModuleMap = {
  core: CoreApi;
};

export type TypedBrokerClient = BrokerClient & {
  [K in keyof ModuleMap]: ModuleMap[K] & {
    on: (event: string, listener: (value: unknown) => void) => void;
    off: (event: string, listener: (value: unknown) => void) => void;
  };
};
