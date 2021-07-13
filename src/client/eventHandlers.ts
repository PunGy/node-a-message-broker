import {
    BaseEventConfig,
    ClientEmitableEvents,
    ClientSubscribableEvents, ErrorCode,
    EventEmitConfigsMap,
    EventResponsesMap,
    EventResult,
    EventType,
    IPCType,
    MessageConfig,
} from '@src/types'
import { isSuccess, randomNumber } from '@src/utils'

/****  SUBSCRIBE HANDLERS  ****/

type OnHandler<K extends ClientSubscribableEvents, T = unknown> = (instance: IPCType, data: EventResponsesMap<T>[K]) => void
const onMessage: OnHandler<EventType.message> = (ipc, data) =>
{
    ipc.of.hub.emit(`${data.messageId}_sent`)
}
export const onHandlers = {
    [EventType.message]: onMessage,
}

/****  EMIT HANDLERS  ****/

export type EmitHandler<
    Event extends ClientEmitableEvents = ClientEmitableEvents,
    ErrorCodes extends ErrorCode = ErrorCode.hubIsNotActive,
    Data = unknown,
> = (
    ipc: IPCType,
    config: EventEmitConfigsMap<Data>[Event] & BaseEventConfig,
) => Promise<EventResult<Data, ErrorCodes>>;

const emitMessage: EmitHandler<EventType.send, ErrorCode.clientDisconnected | ErrorCode.waitMessageTimeout> = (
    ipc,
    config,
) => new Promise((res, rej) =>
{
    const messageId = randomNumber(0, 1000000)

    const resultConfig: MessageConfig = { ...config, messageId }
    ipc.of.hub.emit(
        EventType.message, // For IPC library, there's no difference in names between sending message and receiving message
        resultConfig,
    )

    const waitSendingEvent = `${messageId}_sent`
    ipc.of.hub.on(
        waitSendingEvent,
        (data: EventResult<MessageConfig, ErrorCode.waitMessageTimeout>) =>
        {
            (isSuccess(data) ? res : rej)(data)
            ipc.of.hub.off(waitSendingEvent, '*')
        },
    )
})

const emitListOfSubscribers: EmitHandler<EventType.listOfSubscribers> = (ipc, config) => new Promise((res, rej) =>
{
    ipc.of.hub.emit(
        EventType.listOfSubscribers,
        config,
    )

})

export const emitHandlers = {
    [EventType.send]: emitMessage,
    [EventType.listOfSubscribers]: emitListOfSubscribers,
}
