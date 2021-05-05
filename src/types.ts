import { Socket } from 'net'

export type Clients = 'refresh' | 'website' | 'discord_bot' | 'vk_bot' | 'test'

export type ClientsTable = {
    [key in Clients]?: {
        socket: Socket | null;
        messageQueue: Array<MessageObject>;
    }
}
export interface MessageData<T = unknown> {
    topic: string;
    data: T;
}
export interface MessageObject<T = unknown> {
    from_id: Clients;
    message: MessageData<T>;
    message_id: number;
    to_id?: Clients;
}
export interface MessageStatusObject {
    status: 'done' | 'error';
    description?: string;
}
export type EventTypes = 'message'
