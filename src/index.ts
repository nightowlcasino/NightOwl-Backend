import app from "./server"
import dotenv from "dotenv"
//import getBalanceFor from "./ergo/explorer"
//import LeaderboardDAO from "./dao/leaderboardDAO"

import fetch from "node-fetch";
import {Client} from "@coinbarn/ergo-ts";


//const MongoClient = require('mongodb').MongoClient;

dotenv.config()
const port = process.env.PORT || 8000
const addr: string = "9hD3u8qzDnJ4XT3G2uVj8hdahGgJxkzDXEX2JWnaxc1pUPtx8By"
const explorerApi: string = 'https://api.ergoplatform.com/api/v0';
const client = new Client('https://explorer.ergoplatform.com');

const sk = '0e0c523374347264336463347421';
const recipient = '9hD3u8qzDnJ4XT3G2uVj8hdahGgJxkzDXEX2JWnaxc1pUPtx8By';

async function get(url: string, apiKey: string = '') {
    return await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            api_key: apiKey,
        },
    }).then(res => res.json());
}

async function getRequest(url: string) {
    return get(explorerApi + url).then(res => {
        return { data: res };
    });
}

async function getBalanceFor(addr: string, token = null): Promise<any> {
    return getRequest(
        `/addresses/${addr}`
    )
        .then((res) => res.data)
        .then((res) => res.transactions)
        .then(res => {
            if (!token) return res.confirmedBalance;
            let tok = res.confirmedTokensBalance.filter((tok: any) => tok.tokenId === token);
            if (tok.length === 0) return 0;
            else return tok[0].amount;
        });
}

/*const bal = async () => {
    const r = await getBalanceFor("9hyLhBYEFKc9EiUiWLAtLoAGfgudsFf1RaFyibpLosM693UjFCJ")
    console.log("balance: " + r)
};

bal()*/

const send = async () => {
    // send 0.500 ERG to the recipient
    console.log("Before Send")
    const response = await client.transfer(sk, recipient, 0.500);
    console.log("Send Response")
    console.log("response.data: " + response.data)
    console.log("response.status: " + response.status)
};

//send()
// wasm.Address.from_mainnet_str(OUR_SWAP_CONTRACT_P2S).to_ergo_tree().to_base16_bytes(),

//const work = async () => {
//   return new Promise(resolve => setTimeout(resolve, 2000));
//}

//async function startClock() {
//    for (;;) {
//        await work()
//        console.log("Hello")
//    }
//}

/**MongoClient.connect(
    process.env.CASINO_DB_URI,
    {
        maxPoolSize: 50,
        wtimeoutMS: 2500,
        useNewUrlParser: true
    })
    .catch((err: { stack: any; }) => {
        console.error("Error while connecting to mongodb - " + err.stack)
        process.exit(1)
    })
    .then(async (client: any) => {
        await LeaderboardDAO.injectDB(client)
        app.listen(port, () => {
            console.log(`listening on port ${port}`)
        })
    })*/
//await startClock()

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
