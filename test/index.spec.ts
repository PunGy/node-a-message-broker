import { hello } from '@src/index';

describe('hello', () => {
    it('prints hello', () => {
        expect(hello()).toBe('hello')
    })
})
