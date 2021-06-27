import { IPC } from 'node-ipc'
import { EventType, MessageObject, EventTypesHandlersMap, Result, IPCType, FailedResult, ErrorCode } from './types'
import { isNil, isSuccess, randomNumber } from './utils'

type ConnectionsTable = Map<string, ConnectionInstance>
const connections: ConnectionsTable = new Map()

export interface Connection<Clients extends string = string>
{
    id: Clients;
    isSubscribed: boolean;

    subscribe: () => Promise<IPCType>;
    on: <K extends EventType, T = unknown>(
        event: K,
        handler: (data: EventTypesHandlersMap<T>[K]) => void
    ) => (data: EventTypesHandlersMap<T>[K]) => void;
    off: <T = unknown>(event: EventType, handler: (data: T) => void) => void;
    send: (to: Clients, message: unknown) => Promise<Result>;
    onMessage: (handler: (data: MessageObject) => void) => (data: MessageObject) => void;
}

export class ConnectionInstance implements Connection
{
    public id: string
    public isSubscribed: boolean
    private ipc: IPCType

    constructor(id: string)
    {
        if (connections.has(id)) return connections.get(id)!
        this.id = id
        this.isSubscribed = false
        connections.set(id, this)
    }

    public on<K extends EventType, T = unknown>(event: K, handler: (data: EventTypesHandlersMap<T>[K]) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before adding event handlers')
        this.ipc.of.hub.on(
            event,
            handler,
        )
        return handler
    }

    public off<T = unknown>(event: EventType, handler: (data: T) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before removing event handlers')
        this.ipc.of.hub.off(
            event,
            handler,
        )
    }

    public onMessage(handler: (data: MessageObject) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before adding event handlers')
        this.ipc.of.hub.on(
            EventType.message,
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
                EventType.message,
                { from_id: this.id, to_id: to, message, message_id },
            )

            const waitSendingEvent = `${message_id}_sent`
            this.ipc.of.hub.on(
                waitSendingEvent,
                (data: Result) =>
                {
                    (isSuccess(data) ? res : rej)(data)
                    this.ipc.of.hub.off(waitSendingEvent, '*')
                },
            )
        })
    }

    public subscribe(customIpcConfig: Partial<IPCType['config']> = {}): Promise<IPCType>
    {
        return new Promise<IPCType>((res, rej) =>
        {
            const ipc = new IPC()

            const baseIpcConfig: Partial<IPCType['config']> = {
                id: this.id,
                retry: 500,
                maxRetries: 0,
                silent: true,
            }
            Object.assign(
                ipc.config,
                baseIpcConfig,
                customIpcConfig,
            )

            ipc.connectTo('hub', () =>
            {
                ipc.of.hub
                    .on(
                        EventType.connect,
                        () =>
                        {
                            ipc.of.hub.emit(
                                EventType.subscribe,
                                {
                                    id: ipc.config.id,
                                },
                            )
                        },
                    ).on(
                        EventType.subscribe,
                        (response: EventTypesHandlersMap[EventType.subscribe]) =>
                        {
                            console.log(response)
                            if (isSuccess(response))
                            {
                                this.ipc = ipc
                                this.isSubscribed = true
                                res(ipc)
                            }
                            else
                            {
                                rej(response)
                            }
                        },
                    )
                    .on( // Handle an inner ipc errors
                        'error',
                        (error: { errno: number; code: string; syscall: string; address: string; }) =>
                        {
                            if (error.syscall === EventType.connect && error.code === 'ENOENT')
                            {
                                rej({ errorCode: ErrorCode.hubIsNotActive, reason: 'hub isn\'t reached', status: 'failed' } as FailedResult)
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
                EventType.unsubscribe,
                () =>
                {
                    res(true)
                    this.ipc.disconnect('hub')
                },
            )
            this.ipc.of.hub.emit(
                EventType.unsubscribe,
                { id: this.id },
            )
        })
    }
}

export { isSuccess, isFailed } from './utils'
export * from './types'
