import { IPC } from 'node-ipc'

export type IPCType = InstanceType<typeof IPC>

export interface BaseEventConfig {
    clientId: string;
}

export interface MessageConfig<T = unknown> {
    message: T;
    messageId: number;
    targetId: string;
}

export interface Subscriber {
    id: string;
    connectedAt: string;
}
export type ListOfSubscribers = Array<Subscriber>

export enum Status {
    failed = 'failed',
    success = 'success',
}

export interface SuccessEventResult<P = unknown> {
    status: Status.success;
    payload?: P;
}

export enum ErrorCode {
    // Subscribe codes
    idAlreadySubscribed,

    // Message codes
    clientDisconnected,
    waitMessageTimeout,

    // IPC connection codes
    hubIsNotActive,
}
export interface FailedEventResult<C extends Partial<ErrorCode> = ErrorCode> {
    status: Status.failed;
    errorCode: C | ErrorCode.hubIsNotActive;
    reason: string;
}
export type EventResult<SuccessPayload = unknown, Codes extends Partial<ErrorCode> = ErrorCode> =
    SuccessEventResult<SuccessPayload> | FailedEventResult<Codes>

export const enum EventType {
    message = 'message',
    send = 'send',
    subscribe = 'subscribe',
    unsubscribe = 'unsubscribe',
    connect = 'connect',
    listOfSubscribers = 'listOfSubscribers'
}

export type ClientSubscribableEvents = EventType.message
export type ClientEmitableEvents = EventType.send | EventType.listOfSubscribers

export interface EventResponsesMap<T = unknown> {
    [EventType.message]: MessageConfig<T>;
    [EventType.send]: EventResult;
    [EventType.listOfSubscribers]: EventResult<ListOfSubscribers>;
    [EventType.subscribe]: EventResult<string, ErrorCode.idAlreadySubscribed>;
    [EventType.unsubscribe]: EventResult;
    [EventType.connect]: void;
}

export interface EventEmitConfigsMap<T = unknown> {
    [EventType.send]: Omit<MessageConfig<T>, 'messageId'>;
    [EventType.listOfSubscribers]: void;
    [EventType.subscribe]: void;
    [EventType.unsubscribe]: void;
    [EventType.connect]: void;
}
