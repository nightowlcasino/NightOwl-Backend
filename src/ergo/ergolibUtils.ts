import { MAX_NUMBER_OF_UNUSED_ADDRESS_PER_ACCOUNT, NANOERG_TO_ERG, TOKENID_FAKE_SIGUSD, TOKENID_TEST } from '../constants/ergo';
import { addressHasTransactions, currentHeight, unspentBoxesFor, unspentBoxesForV1 } from './explorer';
import { byteArrayToBase64 } from './serializer';
import { getLastHeaders } from "./node";
import JSONBigInt from 'json-bigint';
import { getTokenListFromUtxos, getUtxosListValue, parseUtxos, parseUtxo } from './utxos';
import {
    Address,
    BlockHeaders,
    BoxId,
    BoxValue,
    Contract,
    DataInputs,
    DerivationPath,
    ErgoBoxes,
    ErgoBoxCandidate,
    ErgoBoxCandidates,
    ErgoBoxCandidateBuilder,
    ErgoStateContext,
    ExtPubKey,
    ExtSecretKey,
    I64,
    Mnemonic,
    NetworkAddress,
    NetworkPrefix,
    PreHeader,
    ReducedTransaction,
    TokenAmount,
    TokenId,
    UnsignedInput,
    UnsignedInputs,
    UnsignedTransaction 
} from '../../pkg-nodejs/ergo_lib_wasm'

/* global BigInt */

const deriveSecretKey = (rootSecret: any, path: any) =>
    rootSecret.derive(path);


export async function getMainAddress(mnemonic: any) {
    return getAddress(mnemonic, 0, 0);
}

export async function getAddress(mnemonic: any, accountId: any, index: any) {
    const seed = Mnemonic.to_seed(mnemonic, "");
    const rootSecret = ExtSecretKey.derive_master(seed);
    //console.log("seed", seed);
    //console.log("rootSecret", rootSecret);

    let path = DerivationPath.new(accountId, new Uint32Array([index]));
    const changeSecretKey = deriveSecretKey(rootSecret, path);
    const changePubKey = changeSecretKey.public_key();
    const changeAddress = NetworkAddress.new(NetworkPrefix.Mainnet, changePubKey.to_address());
    path = DerivationPath.new(0, new Uint32Array([0]));
    //console.log("derivation path", path.toString());
    //console.log("Change address", changeAddress.to_base58());

    return changeAddress.to_base58();
}

// Search used addresses for a given mnemonic as per BIP-44
// https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
export async function discoverAddresses(mnemonic: any) {
    const seed = Mnemonic.to_seed(mnemonic, "");
    const rootSecret = ExtSecretKey.derive_master(seed);
    let accountId = 0, txForAccountFound = true, accounts = [], unusedAddresses = [];
    const numberOfUnusedAddress = MAX_NUMBER_OF_UNUSED_ADDRESS_PER_ACCOUNT;
    while (txForAccountFound) {
        let index = 0, indexMax = 20, accountAddrressList = [];
        txForAccountFound = false;
        unusedAddresses = [];
        while (index < indexMax) {
            let newPath = DerivationPath.new(accountId, new Uint32Array([index]));
            const newPubKey = deriveSecretKey(rootSecret, newPath).public_key();
            const newAddress = NetworkAddress.new(NetworkPrefix.Mainnet, newPubKey.to_address());
            const newAddressStr = newAddress.to_base58();
            //console.log("discoverAddresses", newAddress, accountId, index)
            if (await addressHasTransactions(newAddressStr)) {
                newPath = DerivationPath.new(accountId, new Uint32Array([index]));
                //console.log("newPath", newPath.toString());
                //console.log("newAddress", newAddress.to_base58());
                indexMax = index + 20;
                txForAccountFound = true
                const address = {
                    id: index,
                    address: newAddressStr,
                    used: true,
                };
                accountAddrressList.push(address);
            } else {
                if (unusedAddresses.length < numberOfUnusedAddress) {
                    unusedAddresses.push(newAddressStr);
                    accountAddrressList.push({
                        id: index,
                        address: newAddressStr,
                        used: false,
                    });
                }
            }
            index++;
        }
        if (accountAddrressList.length > unusedAddresses.length) {
            accounts.push({
                id: accountId,
                addresses: accountAddrressList,
                name: "Account_" + accountId.toString(),
            });
        }
        accountId++;
    }
    if (accounts.length === 0) { // new address
        const mainAddress = {
            id: 0,
            address: await getMainAddress(mnemonic),
            used: false,
        };
        accounts.push({
            id: 0,
            addresses: [mainAddress],
            name: "Account_0",
        });
    }
    console.log(accounts);
    return accounts;
}

export async function testAddrGen(addr: any) {
    const addrBytes: any = Address.from_base58(addr).to_bytes
    const chain_code: any = [0]
    //  static new(secret_key_bytes: Uint8Array, chain_code: Uint8Array, derivation_path: DerivationPath): ExtSecretKey;
    // from_base58(s: string): Address;
    // to_bytes(network_prefix: number): Uint8Array;

    const pubkey = ExtPubKey.new(addrBytes, chain_code, DerivationPath.new(0, new Uint32Array([1])))
    console.log(pubkey.to_address().to_base58)
}

export async function isValidErgAddress(address: any) {
    try {
        const addrBytes = Address.from_base58(address).to_bytes
        console.log("isValidErgAddress addrBytes", addrBytes);
        return true;
    } catch (e) {
        console.log("isValidErgAddress catch", e);
        return false;
    }
}

// Address list
// Erg amount to send, including the tx fee
// list of tokenId to send
// list of token amount to send
export async function getUtxosForSelectedInputs(inputAddressList: any, ergAmount: any, tokens: any, tokensAmountToSend: any) {
    let utxos: any[]
    try {
        utxos = parseUtxos(await Promise.all(inputAddressList.map(async (address: any) => {
            return await unspentBoxesForV1(address);
        })).then(boxListList => boxListList.flat()));
    } catch (e) {
        console.log("caught exception from parseUtxos", e)
        return []
    }

    // Select boxes to meet tokens selected
    var selectedUtxos = [], unSelectedUtxos = utxos, i = 0;
    while (!hasEnoughSelectedTokens(selectedUtxos, tokens, tokensAmountToSend) && i < 1000) {
        //console.log("getUtxosForSelectedInputs1", selectedUtxos, unSelectedUtxos);
        var boxFound = false, boxIndex = -1;
        for (const j in tokens) {   
            if (tokensAmountToSend[j] > 0 && !boxFound) {
                //console.log("getUtxosForSelectedInputs2", tokens[j].tokenId, tokensAmountToSend[j], boxFound, unSelectedUtxos);
                boxIndex = unSelectedUtxos.findIndex(utxo => utxo.assets.map((tok: { tokenId: string; })=>tok.tokenId).includes(tokens[j].tokenId))
                //console.log("getUtxosForSelectedInputs3 boxIndex", boxIndex);
            }
        }
        if (boxIndex > -1) {
            selectedUtxos.push(unSelectedUtxos.splice(boxIndex, 1)[0]);
        }
        i++
    }
    // Select boxes until we meet Erg requirement
    while (BigInt(Math.round(ergAmount*NANOERG_TO_ERG)) > getUtxosListValue(selectedUtxos) && unSelectedUtxos.length > 0) {
        selectedUtxos.push(unSelectedUtxos.shift());
    }
    return selectedUtxos;
}


//
// utxos: utxo list
// requiredTokens: Array of token id selected
// requiredTokenAmounts: Array of token amount (float) synchronized with requiredTokens
export function hasEnoughSelectedTokens(utxos: any, requiredTokens: any, requiredTokenAmounts: any) {
    const utxosTokens = getTokenListFromUtxos(utxos);
    const fixedRequiredTokenAmounts = requiredTokenAmounts.map((amount: any, id: any) => Math.round(parseFloat(amount.toString()) * Math.pow(10,requiredTokens[id].decimals)))
    //console.log("utxosTokens",utxosTokens)
    //console.log("fixedRequiredTokenAmounts",fixedRequiredTokenAmounts)
    //console.log("requiredTokens",requiredTokens)
    for (const i in requiredTokens) {
        if (fixedRequiredTokenAmounts[i] > 0) {
            //console.log("requiredTokens[i].tokenId", requiredTokens[i].tokenId)
            //console.log("Object.keys(utxosTokens).includes(requiredTokens[i].tokenId)", Object.keys(utxosTokens).includes(requiredTokens[i].tokenId))
            if (!Object.keys(utxosTokens).includes(requiredTokens[i].tokenId)) {
                //console.log("hasEnoughSelectedTokens 1", Object.keys(utxosTokens), requiredTokens[i].tokenId)
                return false;
            }
            for (const tokenId of Object.keys(utxosTokens)) {
                //console.log("utxosTokens[tokenId]", utxosTokens[tokenId])
                //console.log("fixedRequiredTokenAmounts[i]", fixedRequiredTokenAmounts[i])
                if (tokenId === requiredTokens[i].tokenId && utxosTokens[tokenId] < fixedRequiredTokenAmounts[i]) {
                    //console.log("hasEnoughSelectedTokens 2", tokenId, requiredTokens[i].tokenId, utxosTokens[tokenId], fixedRequiredTokenAmounts[i]);
                    return false;
                }
            }
        }
    }
    return true;
}

function getBoxValueAmount(valueInt: bigint): BoxValue {
    return BoxValue.from_i64(I64.from_str(valueInt.toString()))
}

export async function createTxOutputs(selectedUtxos: any, sendToAddress: string, changeAddress: any, amountToSendFloat: any, feeFloat: any, tokens: any, tokenAmountToSend: any) {
    const creationHeight = await currentHeight() - 20; // allow some lag between explorer and node
    const amountNano = BigInt(Math.round((amountToSendFloat * NANOERG_TO_ERG)));
    const feeNano =  BigInt(Math.round((feeFloat * NANOERG_TO_ERG)));
    const outputCandidates = ErgoBoxCandidates.empty();
    let paymentBox: ErgoBoxCandidateBuilder

    try {
        paymentBox = new ErgoBoxCandidateBuilder(
            getBoxValueAmount(amountNano),
            Contract.pay_to_address(Address.from_base58(sendToAddress)),
            creationHeight);
    } catch (e) {
        console.log("Error creating paymentBox: ", e);
        throw e
    }
    for(const i in tokens){
        if(tokenAmountToSend[i] > 0){
            //console.log("createTxOutputs tokenAmountToSend", tokenAmountToSend[i])
            paymentBox.add_token(TokenId.from_str(tokens[i].tokenId),
                TokenAmount.from_i64(I64.from_str(tokenAmountToSend[i].toString())
            ));
        }
    }
    outputCandidates.add(paymentBox.build());

    // prepare the miner fee box
    const feeBox = ErgoBoxCandidate.new_miner_fee_box(getBoxValueAmount(feeNano), await currentHeight());
    outputCandidates.add(feeBox);

    // prepare the change box
    const changeAmountNano = getUtxosListValue(selectedUtxos) - amountNano - feeNano;
    if (changeAmountNano > 0){
        //console.log("createTxOutputs changeAmountNano", getUtxosListValue(selectedUtxos) , amountNano, feeNano, changeAmountNano);
        var changeBox = new ErgoBoxCandidateBuilder(
            getBoxValueAmount(changeAmountNano),
            Contract.pay_to_address(Address.from_base58(changeAddress)),
            creationHeight);
        const inputsTokens = getTokenListFromUtxos(selectedUtxos);
        for(const tokId of Object.keys(inputsTokens)){
            const missingOutputToken = inputsTokens[tokId] - tokenAmountToSend[tokens.findIndex((tok: { tokenId: string; }) => tok.tokenId === tokId)];
            if (missingOutputToken > 0) {
                changeBox.add_token(TokenId.from_str(tokId),
                    TokenAmount.from_i64(I64.from_str(missingOutputToken.toString())
                ));
            }
        }
        outputCandidates.add(changeBox.build());
    }

    return outputCandidates;

}

export async function createUnsignedTransaction(selectedUtxos: any[], outputCandidates: any) {
    //console.log("createUnsignedTransaction selectedUtxos",selectedUtxos);
    const inputIds = selectedUtxos.map(utxo => utxo.boxId);
    const unsignedInputArray = inputIds.map(BoxId.from_str).map(UnsignedInput.from_box_id)
    const unsignedInputs = new UnsignedInputs();
    unsignedInputArray.forEach((i) => unsignedInputs.add(i));
    const unsignedTx = new UnsignedTransaction(unsignedInputs, new DataInputs(), outputCandidates);
    //console.log("createUnsignedTransaction unsignedTx",unsignedTx.to_json());
    return unsignedTx;
}

// https://github.com/ergoplatform/eips/pull/37 ergopay:<txBase64safe>
export async function getTxReducedB64Safe(json: any, inputs: any, dataInputs = []) {
    //console.log("getTxReducedB64Safe", json, inputs, dataInputs);
    const [txId, reducedTx] = await getTxReduced(json, inputs, dataInputs);
    //console.log("getTxReducedB64Safe1", json, inputs, dataInputs);
    // Reduced transaction is encoded with Base64
    const txReducedBase64 = byteArrayToBase64(reducedTx.sigma_serialize_bytes());
    //console.log("getTxReducedB64Safe2", json, inputs, dataInputs);
    //const ergoPayTx = "ergopay:"+txReducedBase64.replace(/\//g, '_').replace(/\+/g, '-');
    const ergoPayTx = txReducedBase64.replace(/\//g, '_').replace(/\+/g, '-');
    //console.log("getTxReducedB64Safe3", json, inputs, dataInputs);
    // split by chunk of 1000 char to generates the QR codes
    return [txId, ergoPayTx.match(/.{1,1000}/g)];
}

async function getTxReduced(json: any, inputs: any, dataInputs: any): Promise<[string, ReducedTransaction]>  {
    // build ergolib objects from json
    //console.log("getTxReduced", json, inputs, dataInputs);
    const unsignedTx = UnsignedTransaction.from_json(JSONBigInt.stringify(json));
    const inputBoxes = ErgoBoxes.from_boxes_json(inputs);
    const inputDataBoxes = ErgoBoxes.from_boxes_json(dataInputs);

    const block_headers = BlockHeaders.from_json(await getLastHeaders());
    const pre_header = PreHeader.from_block_header(block_headers.get(0));

    const ctx = new ErgoStateContext(pre_header, block_headers);
    return [unsignedTx.id().to_str(), ReducedTransaction.from_unsigned_tx(unsignedTx,inputBoxes,inputDataBoxes,ctx)];
}

export function getBestUtxoSC(utxos: any[], tokenId: string, tokenAmount: number): any {
    // grab 1 or more utxos from the input utxos that has enough available tokens
    for (const u in utxos) {
        const u_parsed = parseUtxo(utxos[u])
        // check that both SigUSD and OWL tokens are present for SC utxo
        const tokenIds = u_parsed.assets.map((val: any) => val.tokenId)
        if (tokenIds.indexOf(TOKENID_TEST) == -1 || 
            tokenIds.indexOf(TOKENID_FAKE_SIGUSD) == -1) {
            continue
        }
        for (const t in u_parsed.assets) {
            // check there is enough to swap
            if (u_parsed.assets[t].tokenId == tokenId &&
                Number(u_parsed.assets[t].amount) >= Number(tokenAmount)) {
                return utxos[u]
            }
        }
    }
}

export function getBestUtxoSender(utxos: any[], tokenId: string, tokenAmount: number, fees: bigint): any {
    // grab 1 or more utxos from the input utxos that has enough available tokens
    for (const u in utxos) {
        const u_parsed = parseUtxo(utxos[u])
        // check if there is enough ERG in the box to fulfill the tx fees
        if (BigInt(u_parsed.value) >= fees) {
            for (const t in u_parsed.assets) {
                if (u_parsed.assets[t].tokenId == tokenId &&
                    Number(u_parsed.assets[t].amount) >= Number(tokenAmount)) {
                    return utxos[u]
                }
            }
        }
    }
}