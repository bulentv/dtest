export enum MessageType {
  Request = 0,
  Response = 1,
  Event = 2
}

export interface Message {
  id: string;
  requestId?: string;
  type: MessageType;
  target: string;
  method?: string;
  payload: unknown;
  ts: number;
}