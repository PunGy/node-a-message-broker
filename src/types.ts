import { IPC } from 'node-ipc'

export type IPCType = InstanceType<typeof IPC>

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
    errorCode: C;
    reason: string;
}
export type EventResult<SuccessPayload = unknown, Codes extends Partial<ErrorCode> = ErrorCode> =
    SuccessEventResult<SuccessPayload> | FailedEventResult<Codes>

export enum EventType {
    message = 'message',
    subscribe = 'subscribe',
    unsubscribe = 'unsubscribe',
    connect = 'connect',
}

export interface SubscribeConfig {
    id: string;
}

export interface EventTypesHandlersMap<T = unknown> {
    [EventType.message]: MessageObject<T>;
    [EventType.subscribe]: SuccessEventResult<string> | FailedEventResult<ErrorCode.idAlreadySubscribed>;
    [EventType.unsubscribe]: SuccessEventResult | FailedEventResult;
    [EventType.connect]: void;
}
