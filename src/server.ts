import ipc from 'node-ipc'
import { isNil } from './utils'
import { Client, ClientsTable, ErrorCode, EventType, MessageObject, Status, SubscribeConfig, IPCType } from './types'
import { Socket } from 'net'

ipc.config.id = 'hub'
ipc.config.silent = true

const clientsTable: ClientsTable = new Map()

const { log } = console

function serve()
{
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
            if (isNil(destinationClient))
            {
                ipc.server.emit(
                    senderClient.socket,
                    waitSendingEvent,
                    { status: Status.failed, errorCode: ErrorCode.clientDisconnected, reason: `${data.to_id} is disconnected` },
                )
                return
            }

            ipc.server.emit(
                destinationClient.socket,
                EventType.message,
                data,
            )
            // Register event for waiting for the message completed sending
            ipc.server.on(
                waitSendingEvent,
                () =>
                {
                    if (senderClient.socket) // if the client is still active
                    {
                        ipc.server.emit( // send the message was successfully sent
                            senderClient.socket,
                            waitSendingEvent,
                            { status: Status.success },
                        )
                    }
                },
            )
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
