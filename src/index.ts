import { IPC } from 'node-ipc'
import { Clients, EventTypes, MessageStatusObject, MessageObject } from './types'
import { isNil } from './utils'
import { randomNumber } from './utils'

type ConnectionsTable = {
    [key in Clients]?: IPCConnection;
}
const connections: ConnectionsTable = {}

type IPCType = InstanceType<typeof IPC>
export interface Connection
{
    id: Clients;
    subscribe: () => Promise<IPCType>;
    on: <T = unknown>(event: EventTypes, handler: (data: T) => void) => (data: T) => void
    off: <T = unknown>(event: EventTypes, handler: (data: T) => void) => void
    send: (to: Clients, message: unknown) => Promise<MessageStatusObject>
    onMessage: (handler: (data: MessageObject) => void) => (data: MessageObject) => void
}
export default class IPCConnection implements Connection
{
    public id: Clients
    private ipc: IPCType

    constructor(id: Clients)
    {
        if (connections[id]) return connections[id]
        this.id = id
        connections[id] = this
    }
    public on<T = unknown>(event: EventTypes, handler: (data: T) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before adding event handlers')
        this.ipc.of.hub.on(
            event,
            handler,
        )
        return handler
    }
    public off<T = unknown>(event: EventTypes, handler: (data: T) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before adding event handlers')
        this.ipc.of.hub.off(
            event,
            handler,
        )
    }
    public onMessage(handler: (data: MessageObject) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before adding event handlers')
        this.ipc.of.hub.on(
            'message',
            (data: MessageObject) =>
            {
                this.ipc.of.hub.emit(`${data.message_id}_sent`)
                handler(data)
            },
        )
        return handler
    }
    public send(to: Clients, message: unknown)
    {
        return new Promise<MessageStatusObject>((res) =>
        {
            if (isNil(this.ipc)) throw new Error('You should subscribe to hub before sending messages')

            const message_id = randomNumber(0, 1000000)
            this.ipc.of.hub.emit(
                'message',
                { from_id: this.id, to_id: to, message, message_id },
            )

            const waitSendingEvent = `${message_id}_sent`
            this.ipc.of.hub.on(
                waitSendingEvent,
                (data: MessageStatusObject) =>
                {
                    res(data)
                    this.ipc.of.hub.off(waitSendingEvent, '*')
                },
            )
        })
    }
    public subscribe()
    {
        return new Promise<InstanceType<typeof IPC>>((res) =>
        {
            const ipc = new IPC()
            ipc.config.id = this.id
            ipc.config.retry = 2000
            ipc.config.maxRetries = true
            ipc.config.silent = true

            ipc.connectTo('hub', () =>
            {
                ipc.of.hub.on(
                    'connect',
                    () =>
                    {
                        console.log('## connected to hub ##')
                        ipc.of.hub.emit(
                            'subscribe',
                            {
                                id: ipc.config.id,
                            },
                        )
                    },
                )
                ipc.of.hub.on(
                    'subscribed',
                    () =>
                    {
                        this.ipc = ipc
                        res(ipc)
                    },
                )
                ipc.of.hub.on(
                    'disconnect',
                    () =>
                    {
                        console.log('disconnected from hub')
                    },
                )
            })
        })
    }
    public unsubscribe()
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before unsubscribing')
        return new Promise((res) =>
        {
            this.ipc.of.hub.on(
                'unsubscribed',
                () =>
                {
                    res(true)
                    this.ipc.disconnect('hub')
                },
            )
            this.ipc.of.hub.emit(
                'unsubscribe',
                { id: this.id },
            )
        })

    }
}

