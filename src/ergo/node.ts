import { DEFAULT_NODE_ADDRESS, NIGHTOWL_EXPLORER_API_ADDRESS } from '../constants/ergo';
import { get, postTx } from '../utils/rest';

// in order to secure the node requests (port 9053) the following setting have been done on apache
// prevent any connection to 9053 except from localhost
// proxy https://transaction-builder.ergo.ga/blocks to http://localhost:9053/blocks/lastHeaders/10

//export const nodeApi = DEFAULT_NODE_ADDRESS;
export const nodeApi = NIGHTOWL_EXPLORER_API_ADDRESS;

async function getRequest(url: any) {
    return await get(nodeApi + url).then(res => {
        return { data: res };
    });
}

async function postRequest(url: any, body = {}, apiKey = '') {
    try {
        const res = await postTx(nodeApi + url, body)
        return { data: res };
    } catch(e) {
        console.log("postRequest", e);
        return { data: e }
    }
}

export async function getLastHeaders() {
    return await getRequest('blocks/lastHeaders/10')
        .then(res => res.data);
}

export async function sendTx(json: any) {
    const res = await postRequest('transactions', json);
    return res.data;
}