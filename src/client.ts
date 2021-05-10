import { IPC } from 'node-ipc'
import { EventTypes, MessageObject, EventTypesHandlersMap, Result } from './types'
import { isNil, randomNumber } from './utils'

type ConnectionsTable = Map<string, IPCConnection>
const connections: ConnectionsTable = new Map()

type IPCType = InstanceType<typeof IPC>
export interface Connection<Clients extends string = string>
{
    id: Clients;
    subscribe: () => Promise<IPCType>;
    on: <K extends EventTypes, T = unknown>(
        event: K,
        handler: (data: EventTypesHandlersMap<T>[K]) => void
    ) => (data: EventTypesHandlersMap<T>[K]) => void;
    off: <T = unknown>(event: EventTypes, handler: (data: T) => void) => void;
    send: (to: Clients, message: unknown) => Promise<Result>;
    onMessage: (handler: (data: MessageObject) => void) => (data: MessageObject) => void;
}
export default class IPCConnection implements Connection
{
    public id: string
    private ipc: IPCType

    constructor(id: string)
    {
        if (connections.has(id)) return connections.get(id)!
        this.id = id
        connections.set(id, this)
    }
    public on<K extends EventTypes, T = unknown>(event: K, handler: (data: EventTypesHandlersMap<T>[K]) => void)
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
    public send(to: string, message: unknown)
    {
        return new Promise<Result>((res, rej) =>
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
                (data: Result) =>
                {
                    (data.status === 'done' ? res : rej)(data)
                    this.ipc.of.hub.off(waitSendingEvent, '*')
                },
            )
        })
    }
    public subscribe(config: Partial<IPCType['config']> = {})
    {
        return new Promise<IPCType>((res, rej) =>
        {
            const ipc = new IPC()

            const baseIpcConfig = {
                id: this.id,
                retry: 2000,
                maxRetries: true,
                silent: true,
            }
            Object.assign(
                ipc.config,
                baseIpcConfig,
                config,
            )

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
                    'subscribe',
                    (response: EventTypesHandlersMap[EventTypes.subscribe]) =>
                    {
                        if (response.status === 'done')
                        {
                            this.ipc = ipc
                            res(ipc)
                        }
                        else
                        {
                            rej(response)
                        }
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

