import readline from 'readline'
import IPCConnection from '@src/client'

const prompt = (rl: readline.Interface) => (message: string) => new Promise<string>(res => rl.question(message, res))

function showMenu()
{
    process.stdout.write(`\
1) Server info
2) Participants
3) Enter Chat`)
}

async function run()
{
    const rl = readline.createInterface(process.stdin, process.stdout)
    const ask = prompt(rl)

    const clientID = await ask('set up your name: ')
    rl.setPrompt(clientID + ': ')

    const connection = new IPCConnection(clientID)
    const res = await connection.subscribe().catch
    console.log(res)
}
