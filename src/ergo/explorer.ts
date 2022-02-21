import { DEFAULT_EXPLORER_API_ADDRESS } from '../constants/ergo';
import { get } from '../utils/rest';

const explorerURL = DEFAULT_EXPLORER_API_ADDRESS;
export const trueAddress = '4MQyML64GnzMxZgm'; // dummy address to get unsigned tx from node, we only care about the boxes though in this case
export const explorerApi = explorerURL + 'api/v0';
export const explorerApiV1 = explorerURL + 'api/v1';

async function getRequest(url: any) {
    return get(explorerApi + url).then(res => {
        return { data: res };
    });
}

async function getRequestV1(url: any) {
    return get(explorerApiV1 + url).then(res => {
        return { data: res };
    });
}

export async function currentHeight(): Promise<number> {
    return getRequest('/blocks?limit=1')
        .then(res => res.data)
        .then(res => res.items[0].height);
}

export async function unspentBoxesFor(address: any) {
    return getRequest(`/transactions/boxes/byAddress/unspent/${address}`).then(
        (res) => res.data
    );
}

export async function unspentBoxesForV1(address: any) {
    return getRequestV1(`/boxes/unspent/byAddress/${address}`).then(
        (res) => res.data.items
    );
}

export async function boxById(id: any) {
    return getRequest(`/transactions/boxes/${id}`).then((res) => res.data);
}

export async function boxByBoxId(id: any) {
    return getRequestV1(`/boxes/${id}`).then((res) => res.data);
}

export async function txById(id: any) {
    return getRequest(`/transactions/${id}`).then((res) => res.data);
}

export async function getSpendingTx(boxId: any) {
    const data = getRequest(`/transactions/boxes/${boxId}`);
    return data
        .then((res) => res.data)
        .then((res) => res.spentTransactionId)
        .catch((_) => null);
}

export async function getUnconfirmedTxsFor(addr: any) {
    return getRequest(
        `/transactions/unconfirmed/byAddress/${addr}`
    )
        .then((res) => res.data)
        .then((res) => res.items);
}

export async function getTokenBox(addr: any) {
    return getRequest(
        `/assets/${addr}/issuingBox`
    )
        .then((res) => res.data[0])
}

export async function getTokenBoxV1(tokenId: any) {
    return getRequestV1(
        `/tokens/${tokenId}`
    )
        .then((res) => res.data)
}

export async function getBalanceConfirmedForAddress(addr: any) {
    return getRequestV1(
        `/addresses/${addr}/balance/confirmed`
    )
        .then((res) => res.data);
}

export async function getBalanceForAddress(addr: any) {
    return getRequestV1(
        `/addresses/${addr}/balance/total`
    )
        .then((res) => res.data);
}

export async function getTransactionsForAddress(addr: any, limit = -1) {
    if (limit > 0) {
        return getRequestV1(
            `/addresses/${addr}/transactions?limit=${limit}`
        )
            .then((res) => res.data);
    } else {
        return getRequestV1(
            `/addresses/${addr}/transactions`
        )
            .then((res) => res.data);
    }
}

export async function addressHasTransactions(addr: any) {
    const txList = await getTransactionsForAddress(addr, 1);
    return (txList.items.length > 0);
}