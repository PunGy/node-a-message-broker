export const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min)

export const isNil = (data: unknown): data is null => data == null
