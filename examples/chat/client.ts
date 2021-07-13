import readline from 'readline'
import { ConnectionInstance, isFailed, EventResult, ErrorCode } from '@src/client'
import { isNil } from '@src/utils'
import { chat, Handler, participants } from './handlers'

const prompt = (rl: readline.Interface) => (message: string) => new Promise<string>(res => rl.question(message, res))

enum MenuOptions {
    Participants = 1,
    EnterChart,
    Exit,
}

function showMenu()
{
    process.stdout.write(`\
${MenuOptions.Participants}) Participants
${MenuOptions.EnterChart}) Enter Chat
${MenuOptions.Exit}) Exit`)
}

const handlers: Record<MenuOptions, Handler> = {
    [MenuOptions.Participants]: participants,
    [MenuOptions.EnterChart]: chat,
    [MenuOptions.Exit]: async () =>
    {
        console.log('Goodbye!')
    },
};

(async function run()
{
    const rl = readline.createInterface(process.stdin, process.stdout)
    const ask = prompt(rl)

    let clientID: string, res: EventResult, connection: ConnectionInstance
    do
    {
        clientID = await ask('set up your name: ')
        rl.setPrompt(clientID + ': ')

        connection = new ConnectionInstance(clientID)
        res = await connection.subscribe().catch(err => err)

        if (isFailed(res)) // duplicated code because of typescript type-check
        {
            if (res.errorCode === ErrorCode.hubIsNotActive)
            {
                console.log('Chat server is not running! Try launch it')
                process.exit()
            }
            else if (res.errorCode === ErrorCode.idAlreadySubscribed)
            {
                console.log('Your name is already taken, try another one')
            }
        }
    } while (isFailed(res))

    for (;;)
    {
        showMenu()

        const option = await ask('Select an option: ')
        const optionKey = parseInt(option, 10)
        if (optionKey === MenuOptions.Exit) break

        const handler: Handler | undefined = handlers[optionKey as MenuOptions]
        if (isNil(handler))
        {
            console.clear()
            console.log(`${option} is unknown menu option, try listed one`)
            continue
        }

        await handler(connection)
        console.clear()
    }
})()
