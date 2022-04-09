import {Serializer} from "@coinbarn/ergo-ts";
import JSONBigInt from 'json-bigint';
import { getLastHeaders } from "./node";
import {
    Address,
    BlockHeaders,
    Constant,
    Contract,
    DerivationPath,
    ErgoBoxes,
    ErgoStateContext,
    ErgoTree,
    ExtSecretKey,
    I64,
    Mnemonic,
    NetworkAddress,
    NetworkPrefix,
    PreHeader,
    ReducedTransaction,
    SecretKey,
    SecretKeys,
    UnsignedTransaction,
    Wallet
} from '../../pkg-nodejs/ergo_lib_wasm'


export async function encodeNum(n: any, isInt = false) {
    if (isInt) return Constant.from_i32(n).encode_to_base16()
    else return Constant.from_i64(I64.from_str(n)).encode_to_base16()
}

export async function decodeNum(n: any, isInt = false) {
    if (isInt) return Constant.decode_from_base16(n).to_i32()
    else return Constant.decode_from_base16(n).to_i64().to_str()

}

export function byteArrayToBase64( byteArray: any ) {
    var binary = '';
    var len = byteArray.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( byteArray[ i ] );
    }
    return btoa( binary );
}

function base64ToByteArray(base64: any) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

export async function encodeHex(reg: any) {
    return Constant.from_byte_array(Buffer.from(reg, 'hex')).encode_to_base16()
}

export async function encodeStr(str: any) {
    return encodeHex(Serializer.stringToHex(str))
}

function toHexString(byteArray: any) {
    return Array.from(byteArray, function(byte: any) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

export async function decodeString(encoded: any) {
    return Serializer.stringFromHex(toHexString(Constant.decode_from_base16(encoded).to_byte_array()))
}

export function ergToNano(erg: any) {
    if (erg === undefined) return 0
    if (erg.startsWith('.')) return parseInt(erg.slice(1) + '0'.repeat(9 - erg.length + 1))
    let parts = erg.split('.')
    if (parts.length === 1) parts.push('')
    if (parts[1].length > 9) return 0
    return parseInt(parts[0] + parts[1] + '0'.repeat(9 - parts[1].length))
}

export async function encodeAddress(address: any) {
    const byteArray: any = Address.from_mainnet_str(address).to_bytes
    return Constant.from_byte_array(byteArray);
}

export async function decodeAddress(addr: any) {
    const address = Address.from_bytes(addr);
    return address.to_base58
}

export async function encodeInt(num: any) {
    return Constant.from_i32(num);
}
export async function decodeInt(num: any) {
    return num.to_i32();
}

export async function encodeLong(num: any) {
    return Constant.from_i64(I64.from_str(num));
}
export async function decodeLong(num: any) {
    return num.to_i64().to_str();
}

export async function encodeLongArray(longArray: any) {
    return Constant.from_i64_str_array(longArray);
}

export async function decodeLongArray(encodedArray: any) {
    return encodedArray.to_i64_str_array();
}

export async function decodeLongArray2(encodedArray: any) {
    const tmp = Constant.from_i64_str_array(encodedArray);
    return tmp.to_i64_str_array();
}

export async function encodeContract(address: any) {
    const tmp = Contract.pay_to_address(Address.from_base58(address));
    return tmp.ergo_tree().to_base16_bytes();
}

export async function ergoTreeToAddress(ergoTree: any) {
    //console.log("ergoTreeToAddress",ergoTree);
    const ergoT = ErgoTree.from_base16_bytes(ergoTree);
    const address = Address.recreate_from_ergo_tree(ergoT);
    return address.to_base58(NetworkPrefix.Mainnet)
}


export async function getErgoStateContext() {
    const block_headers = BlockHeaders.from_json(await getLastHeaders());
    const pre_header = PreHeader.from_block_header(block_headers.get(0));
    return new ErgoStateContext(pre_header, block_headers);
}


export async function getTxReducedFromB64(txReducedB64: any) {
    return ReducedTransaction.sigma_parse_bytes(base64ToByteArray(txReducedB64));
}



export async function getTxJsonFromTxReduced(txReduced: any){
    const reducedTx = await getTxReducedFromB64(txReduced);
    console.log("getTxJsonFromTxReduced", reducedTx);
    return await reducedTx.unsigned_tx().to_js_eip12();
}

export async function signTxReduced(txReducedB64: any, mnemonic: any, address: any) {
    const reducedTx = await getTxReducedFromB64(txReducedB64);
    const wallet = await getWalletForAddress(mnemonic, address);
    const signedTx = wallet.sign_reduced_transaction(reducedTx);
    return await signedTx.to_js_eip12();
}

const deriveSecretKey = (rootSecret: any, path: any) =>
    rootSecret.derive(path); 

//const nextPath = (rootSecret, lastPath) => 
//    rootSecret.derive(lastPath).path().next();


export async function signTxWithMnemonic(json: any, inputs: any, dataInputs: any, mnemonic: any, address: any) {
    const unsignedTx = UnsignedTransaction.from_json(JSONBigInt.stringify(json));
    const inputBoxes = ErgoBoxes.from_boxes_json(inputs);
    const inputDataBoxes = ErgoBoxes.from_boxes_json(dataInputs);

    const wallet = await getWalletForAddress(mnemonic, address);
    console.log("wallet",wallet);
    const ctx = await getErgoStateContext();
    const signedTx = wallet.sign_transaction(ctx, unsignedTx, inputBoxes, inputDataBoxes);
    return await signedTx.to_js_eip12();
}

export async function signTransaction(unsignedTx: any, inputs: any, dataInputs: any, wallet: any) {
    //console.log("signTransaction1", unsignedTx, inputs, dataInputs);
    const unsignedTransaction = UnsignedTransaction.from_json(JSONBigInt.stringify(unsignedTx));
    const inputBoxes = ErgoBoxes.from_boxes_json(inputs);
    const dataInputsBoxes = ErgoBoxes.from_boxes_json(dataInputs);
    const ctx = await getErgoStateContext();
    //console.log("signTransaction2", unsignedTx, inputs, dataInputs);
    const signedTx = wallet.sign_transaction(ctx, unsignedTransaction, inputBoxes, dataInputsBoxes);
    return await signedTx.to_json();
}

async function getWalletForAddress (mnemonic: any, address: any) {
    const dlogSecret = await getSecretForAddress(mnemonic, address);
    var secretKeys = new SecretKeys();
    secretKeys.add(dlogSecret);
    return Wallet.from_secrets(secretKeys);
}

async function getSecretForAddress(mnemonic: any, address: any) {
    const seed = Mnemonic.to_seed(mnemonic, "");
    const rootSecret = ExtSecretKey.derive_master(seed);
    const changePath = await getDerivationPathForAddress(rootSecret, address);
    console.log("changePath", address, changePath.toString());
    const changeSecretKey = deriveSecretKey(rootSecret, changePath);
    //const changePubKey = changeSecretKey.public_key();
    //const changeAddress = NetworkAddress.new(NetworkPrefix.Mainnet, changePubKey.to_address());
    //console.log(`address: ${changeAddress.to_base58()}`);
    
    const dlogSecret = SecretKey.dlog_from_bytes(changeSecretKey.secret_key_bytes());
    return dlogSecret;
}

export async function getWalletForAddresses(mnemonic: any, addressList: any) {
    var secretKeys = new SecretKeys();
    for (const addr of addressList) {
        const secret = await getSecretForAddress(mnemonic, addr);
        secretKeys.add(secret);
    }
    return Wallet.from_secrets(secretKeys);
}

async function getDerivationPathForAddress(rootSecret: any, address: any) {
    let path = DerivationPath.new(0, new Uint32Array([0]));
    var subsequentsMaxes = [10, 100, 1000];
    var i = 0, j = 0, found = false;
    for (const max of subsequentsMaxes) {
        while (i<max && !found) {
            j = 0;
            while (j<max && !found) {
                let path = DerivationPath.new(i, new Uint32Array([j]));
                const changeSecretKey = deriveSecretKey(rootSecret, path);
                const changePubKey = changeSecretKey.public_key();
                const changeAddress = NetworkAddress.new(NetworkPrefix.Mainnet, changePubKey.to_address()).to_base58();
                if (changeAddress === address) {
                    found = true;
                    return DerivationPath.new(i, new Uint32Array([j]));
                }
                j++;
            }
            i++;
        }
    }
    return path;
}

//export async function signTx(json, inputs, dataInputs, mnemonic) {
//    const unsignedTx = UnsignedTransaction.from_json(JSONBigInt.stringify(json));
//    const inputBoxes = ErgoBoxes.from_boxes_json(inputs);
//    const inputDataBoxes = ErgoBoxes.from_boxes_json(dataInputs);
//    var secrets = new SecretKeys();
//    const secret = SecretKey.from
//    const wallet = Wallet.from_mnemonic(mnemonic, "");
//    const ctx = await getErgoStateContext();
//    const signedTx = wallet.sign_transaction(ctx, unsignedTx, inputBoxes, inputDataBoxes);
//    return await signedTx.to_js_eip12();
//}