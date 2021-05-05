import ipc from 'node-ipc'
import { isNil } from './utils'
import { Clients, ClientsTable, MessageObject } from './types'

ipc.config.id = 'hub'
ipc.config.silent = true

const clientsTable: ClientsTable = {}

export interface SubscribeObject {
    id: Clients
}

const log = console.log

function serve()
{
    log('Message hub was started')
    ipc.server.on(
        'message',
        (data: MessageObject) =>
        {
            log(`got a message from ${data.from_id} to ${data.to_id}, the message is ${data.message}`)
            const waitSendingEvent = `${data.message_id}_sent`

            const destinationClient = clientsTable[data.to_id]
            if (isNil(destinationClient?.socket))
            {
                ipc.server.emit(
                    clientsTable[data.from_id].socket,
                    waitSendingEvent,
                    { status: 'error', description: `${data.to_id} is disconnected` },
                )
                if (isNil(destinationClient))
                    clientsTable[data.to_id] = { socket: null, messageQueue: [data] }
                else
                    destinationClient.messageQueue.push(data)

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
                    ipc.server.emit(
                        clientsTable[data.from_id].socket,
                        waitSendingEvent,
                        { status: 'done' },
                    )
                },
            )
        },
    )
    ipc.server.on(
        'subscribe',
        ({ id }: SubscribeObject, socket) =>
        {
            log(`Get new subscriber: ${id}`)
            if (isNil(clientsTable[id]))
                clientsTable[id] = { socket, messageQueue: [] }
            else
                clientsTable[id].socket = socket

            ipc.server.emit(
                socket,
                'subscribed',
                { id },
            )

            const client = clientsTable[id]
            if (client.messageQueue.length > 0)
            {
                client.messageQueue.forEach((data) =>
                {
                    ipc.server.emit(
                        client.socket,
                        'message',
                        data,
                    )
                })
                client.messageQueue = []
            }
        },
    )
    ipc.server.on(
        'unsubscribe',
        ({ id }: SubscribeObject) =>
        {
            log(`Unsubscribe: ${id}`)
            const { socket } = clientsTable[id]
            delete clientsTable[id].socket
            ipc.server
                .emit(socket, 'unsubscribed', { id })
        },
    )
}

export function start() {
    ipc.serve(serve)
    ipc.server.start()
}
