import { Socket } from 'net'
import { IPC } from 'node-ipc'

export type IPCType = InstanceType<typeof IPC>

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

export enum Status {
    failed = 'failed',
    success = 'success',
}

export interface SuccessResult<P = unknown> {
    status: Status.success;
    payload?: P;
}

export enum ErrorCode {
    // Subscribe codes
    idAlreadySubscribed,

    // Message codes
    clientDisconnected,

    // IPC connection codes
    hubIsNotActive,
}
export interface FailedResult<C extends Partial<ErrorCode> = ErrorCode> {
    status: Status.failed;
    errorCode: C;
    reason: string;
}
export type EventResult<SuccessPayload = unknown, Codes extends Partial<ErrorCode> = ErrorCode> =
    SuccessResult<SuccessPayload> | FailedResult<Codes>

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
    [EventType.subscribe]: SuccessResult<string> | FailedResult<ErrorCode.idAlreadySubscribed>;
    [EventType.unsubscribe]: SuccessResult | FailedResult;
    [EventType.connect]: void;
}
