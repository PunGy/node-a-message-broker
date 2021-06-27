import readline from 'readline'
import { ConnectionInstance, isFailed, EventResult, ErrorCode } from '@src/client'

const prompt = (rl: readline.Interface) => (message: string) => new Promise<string>(res => rl.question(message, res))

function showMenu()
{
    process.stdout.write(`\
1) Server info
2) Participants
3) Enter Chat`)
}

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
})()
