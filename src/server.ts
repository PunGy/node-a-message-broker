import ipc from 'node-ipc'
import { isNil } from './utils'
import { Client, ClientsTable, MessageObject } from './types'
import { Socket } from 'net'

ipc.config.id = 'hub'
ipc.config.silent = true

const clientsTable: ClientsTable = new Map()

export interface SubscribeConfig {
    id: string;
}

const { log } = console

function serve()
{
    log('Message hub was started')
    ipc.server.on(
        'message',
        (data: MessageObject) =>
        {
            log(`got a message from ${data.from_id} to ${data.to_id}, the message is ${data.message}`)
            const waitSendingEvent = `${data.message_id}_sent`

            const senderClient = clientsTable.get(data.from_id)!
            const destinationClient = clientsTable.get(data.to_id)
            if (isNil(destinationClient))
            {
                ipc.server.emit(
                    senderClient.socket,
                    waitSendingEvent,
                    { status: 'error', description: `${data.to_id} is disconnected` },
                )
                return
            }

            ipc.server.emit(
                destinationClient.socket,
                'message',
                data,
            )
            ipc.server.on(
                waitSendingEvent,
                () =>
                {
                    if (senderClient.socket)
                    {
                        ipc.server.emit(
                            senderClient.socket,
                            waitSendingEvent,
                            { status: 'done' },
                        )
                    }
                },
            )
        },
    )
    ipc.server.on(
        'subscribe',
        ({ id }: SubscribeConfig, socket: Socket) =>
        {
            log(`Get a new subscriber: ${id}`)
            if (clientsTable.has(id))
            {
                ipc.server.emit(
                    socket,
                    'subscribe',
                    { id, status: 'failed', reason: 'provided id is already subscribed' },
                )
                return
            }

            const newClient: Client = { socket, connectedAt: Date.now() }
            clientsTable.set(id, newClient)

            ipc.server.emit(
                socket,
                'subscribe',
                { id, status: 'done' },
            )
        },
    )
    ipc.server.on(
        'unsubscribe',
        ({ id }: SubscribeConfig) =>
        {
            log(`Unsubscribe: ${id}`)
            const { socket } = clientsTable.get(id)!
            clientsTable.delete(id)
            ipc.server.emit(socket, 'unsubscribe', { id, status: 'done' })
        },
    )
}

export function start()
{
    ipc.serve(serve)
    ipc.server.start()
    return ipc
}
