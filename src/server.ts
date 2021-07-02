import ipc from 'node-ipc'
import { HUB_ID, isNil } from './utils'
import { ErrorCode, EventType, MessageObject, Status, SubscribeConfig, IPCType, FailedEventResult } from './types'
import { Socket } from 'net'

export interface Client {
    socket: Socket;
    connectedAt: number;
}
export type ClientsTable = Map<string, Client>

ipc.config.id = HUB_ID
ipc.config.silent = true

const clientsTable: ClientsTable = new Map()

const { log } = console

export interface ServeConfig {
    messageTimeout: number;
}
const defaultConfig: ServeConfig = {
    messageTimeout: 2000,
}

function serve(userConfig: Partial<ServeConfig> = {})
{
    const config = { ...defaultConfig, ...userConfig }

    log('Message hub was started')
    ipc.server.on(
        EventType.message,
        (data: MessageObject) =>
        {
            log(`got a message from ${data.from_id} to ${data.to_id}, the message is ${data.message}`)

            // Event name for waiting for the message completed sending
            const waitSendingEvent = `${data.message_id}_sent`

            // If some client send the message - it means it surely in the clients table
            const senderClient = clientsTable.get(data.from_id)!
            const destinationClient = clientsTable.get(data.to_id)

            // In case if client is not registered in clients table - send back an error
            if (isNil(destinationClient))
            {
                ipc.server.emit(
                    senderClient.socket,
                    waitSendingEvent,
                    { status: Status.failed, errorCode: ErrorCode.clientDisconnected, reason: `${data.to_id} is disconnected` },
                )
                return
            }

            // Send the data to the destination client
            ipc.server.emit(
                destinationClient.socket,
                EventType.message,
                data,
            )

            const isSent = false
            const waitCallback = () =>
            {
                if (senderClient.socket) // if the client is still active
                {
                    ipc.server.emit( // send the message was successfully sent
                        senderClient.socket,
                        waitSendingEvent,
                        { status: Status.success },
                    )
                }
            }
            // Register event for waiting for the message completed sending
            ipc.server.on(
                waitSendingEvent,
                waitCallback,
            )

            // If the destination client is not respond about receiving the message in timeout - send an error about it
            setTimeout(() =>
            {
                if (!isSent)
                {
                    ipc.server.off(waitSendingEvent, waitCallback)
                    if (senderClient.socket)
                    {
                        const errorResponse: FailedEventResult = {
                            status: Status.failed,
                            errorCode: ErrorCode.waitMessageTimeout,
                            reason: 'The client is not responded about receiving message in time',
                        }
                        ipc.server.emit(
                            senderClient.socket,
                            waitSendingEvent,
                            errorResponse,
                        )
                    }
                }
            }, config.messageTimeout)
        },
    )
    ipc.server.on(
        EventType.subscribe,
        ({ id }: SubscribeConfig, socket: Socket) =>
        {
            if (clientsTable.has(id))
            {
                ipc.server.emit(
                    socket,
                    EventType.subscribe,
                    {
                        status: Status.failed,
                        errorCode: ErrorCode.idAlreadySubscribed,
                        reason: `provided id (${id}) is already subscribed`,
                    },
                )
                return
            }
            log(`Got a new subscriber: ${id}`)

            const newClient: Client = { socket, connectedAt: Date.now() }
            clientsTable.set(id, newClient)

            socket.on('close', () =>
            {
                // Remove client from clients table in case if connection was interrupted not by the 'unsubscribe' method
                if (clientsTable.has(id))
                {
                    log(`Breaking unsubscribing: ${id}`)
                    clientsTable.delete(id)
                }
            })

            ipc.server.emit(
                socket,
                EventType.subscribe,
                { status: Status.success },
            )
        },
    )
    ipc.server.on(
        EventType.unsubscribe,
        ({ id }: SubscribeConfig) =>
        {
            log(`Unsubscribe: ${id}`)
            const { socket } = clientsTable.get(id)!
            clientsTable.delete(id)
            ipc.server.emit(socket, EventType.unsubscribe, { payload: id, status: Status.success })
        },
    )
}

export function start(): IPCType
{
    ipc.serve(serve)
    ipc.server.start()
    return ipc
}
