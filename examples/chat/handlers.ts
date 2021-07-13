import { ConnectionInstance, EventType } from '@src/client'

export type Handler = (connection: ConnectionInstance) => Promise<void>

export const participants: Handler = async (connection) =>
{

}

export const chat: Handler = (connection) => new Promise((res, rej) =>
{

})
