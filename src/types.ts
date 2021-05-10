import { Socket } from 'net'

export interface Client {
    socket: Socket;
    connectedAt: number;
}
export type ClientsTable = Map<string, Client>
export interface MessageData<T = unknown> {
    topic: string;
    data: T;
}
export interface MessageObject<T = unknown> {
    from_id: string;
    message: MessageData<T>;
    message_id: number;
    to_id: string;
}

export interface SuccessResult {
    status: 'done';
}
export interface FailedResult {
    status: 'failed';
    reason: string;
}
export type Result = SuccessResult | FailedResult

export enum EventTypes {
    message = 'message',
    subscribe = 'subscribe',
    unsubscribe = 'unsubscribe',
    connect = 'connect',
}

export interface EventTypesHandlersMap<T = unknown> {
    [EventTypes.message]: MessageObject<T>;
    [EventTypes.subscribe]: (SuccessResult & { id: string; }) | (FailedResult & { id: string; });
    [EventTypes.unsubscribe]: (SuccessResult & { id: string; }) | (FailedResult & { id: string; });
    [EventTypes.connect]: void;
}
