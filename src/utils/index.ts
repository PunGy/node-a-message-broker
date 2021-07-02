import { FailedEventResult, EventResult, Status, SuccessEventResult } from '../types'

export const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min)

export const isNil = (data: unknown): data is (undefined | null) => data == null

export const isSuccess = (response: EventResult): response is SuccessEventResult => response.status === Status.success
export const isFailed = (response: EventResult): response is FailedEventResult => response.status === Status.failed

export const HUB_ID = 'hub'
