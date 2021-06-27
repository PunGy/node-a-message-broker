import { FailedResult, EventResult, Status, SuccessResult } from '../types'

export const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min)

export const isNil = (data: unknown): data is (undefined | null) => data == null

export const isSuccess = (response: EventResult): response is SuccessResult => response.status === Status.success
export const isFailed = (response: EventResult): response is FailedResult => response.status === Status.failed
