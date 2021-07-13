import ipc from 'node-ipc'
import { HUB_ID, isNil } from './utils'
import { ErrorCode, EventType, Status, IPCType, FailedEventResult, MessageConfig, SubscribeConfig } from './types'
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
        (data: MessageConfig) =>
        {
            log(`got a message from ${data.clientId} to ${data.targetId}, the message is ${data.message}`)

            // Event name for waiting for the message completed sending
            const waitSendingEvent = `${data.messageId}_sent`

            // If some client send the message - it means it surely in the clients table
            const senderClient = clientsTable.get(data.clientId)!
            const destinationClient = clientsTable.get(data.targetId)

            // In case if client is not registered in clients table - send back an error
            if (isNil(destinationClient))
            {
                ipc.server.emit(
                    senderClient.socket,
                    waitSendingEvent,
                    { status: Status.failed, errorCode: ErrorCode.clientDisconnected, reason: `${data.targetId} is disconnected` },
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
        ({ clientId }: SubscribeConfig, socket: Socket) =>
        {
            if (clientsTable.has(clientId))
            {
                ipc.server.emit(
                    socket,
                    EventType.subscribe,
                    {
                        status: Status.failed,
                        errorCode: ErrorCode.idAlreadySubscribed,
                        reason: `provided id (${clientId}) is already subscribed`,
                    },
                )
                return
            }
            log(`Got a new subscriber: ${clientId}`)

            const newClient: Client = { socket, connectedAt: Date.now() }
            clientsTable.set(clientId, newClient)

            socket.on('close', () =>
            {
                // Remove client from clients table in case if connection was interrupted not by the 'unsubscribe' method
                if (clientsTable.has(clientId))
                {
                    log(`Breaking unsubscribing: ${clientId}`)
                    clientsTable.delete(clientId)
                }
            })

            ipc.server.emit(
                socket,
                EventType.subscribe,
                { status: Status.success },
            )
        },
    )
    //
    // ipc.server.on(
    //     EventType.listOfSubscribers,
    //     () =>
    //     {
    //
    //     },
    // )

    ipc.server.on(
        EventType.unsubscribe,
        ({ clientId }: SubscribeConfig) =>
        {
            log(`Unsubscribe: ${clientId}`)
            const { socket } = clientsTable.get(clientId)!
            clientsTable.delete(clientId)
            ipc.server.emit(socket, EventType.unsubscribe, { payload: clientId, status: Status.success })
        },
    )
}

export function start(): IPCType
{
    ipc.serve(serve)
    ipc.server.start()
    return ipc
}
