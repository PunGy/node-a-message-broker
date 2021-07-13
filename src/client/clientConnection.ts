import { IPC } from 'node-ipc'
import {
    ErrorCode,
    EventType,
    Status,
    EventResponsesMap,
    FailedEventResult,
    IPCType,
    EventEmitConfigsMap,
    ClientSubscribableEvents,
    ClientEmitableEvents, BaseEventConfig,
} from '@src/types'
import { HUB_ID, isNil, isSuccess } from '@src/utils'
import { emitHandlers, onHandlers } from '@src/client/eventHandlers'

type ConnectionsTable = Map<string, ConnectionInstance>
const connections: ConnectionsTable = new Map()

export interface Connection<Clients extends string = string>
{
    id: Clients;
    isSubscribed: boolean;

    subscribe: () => Promise<IPCType>;

    // Subscribe an event handler
    on: <Event extends ClientSubscribableEvents, Data = unknown>(
        event: Event,
        handler: (data: EventResponsesMap<Data>[Event]) => void
    ) => (data: EventResponsesMap<Data>[Event]) => void;

    // Unsubscribe an event handler
    off: <Data = unknown>(event: EventType, handler: (data: Data) => void) => void;

    // Emit the event
    emit: <Event extends ClientEmitableEvents, Data = unknown>(
        event: Event,
        config: EventEmitConfigsMap<Data>[Event],
    ) => Promise<EventResponsesMap<Data>[Event]>;
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

    public on<Event extends ClientSubscribableEvents, Data = unknown>(event: Event, handler: (data: EventResponsesMap<Data>[Event]) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before adding event handlers')
        this.ipc.of.hub.on(
            event,
            (data: EventResponsesMap<Data>[Event]) =>
            {
                onHandlers[event](this.ipc, data)
                handler(data)
            },
        )
        return handler
    }

    public off<Data = unknown>(event: EventType, handler: (data: Data) => void)
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before removing event handlers')
        this.ipc.of.hub.off(
            event,
            handler,
        )
    }

    public emit<Event extends ClientEmitableEvents, Data = unknown>(
        event: Event,
        config: EventEmitConfigsMap<Data>[Event],
    )
    {
        if (isNil(this.ipc)) throw new Error('You should subscribe to hub before performing events')

        const emitConfig: EventEmitConfigsMap<Data>[Event] & BaseEventConfig = { ...config, clientId: this.id }
        return emitHandlers[event](this.ipc, emitConfig)
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

            ipc.connectTo(HUB_ID, () =>
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
                        (response: EventResponsesMap[EventType.subscribe]) =>
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
                                const failedResult: FailedEventResult = {
                                    errorCode: ErrorCode.hubIsNotActive,
                                    reason: 'hub isn\'t reached',
                                    status: Status.failed,
                                }
                                rej(failedResult)
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
                    this.ipc.disconnect(HUB_ID)
                },
            )
            this.ipc.of.hub.emit(
                EventType.unsubscribe,
                { id: this.id },
            )
        })
    }
}
