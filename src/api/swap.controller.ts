import { Request, Response } from "express"
import {
    NANOERG_TO_ERG,
    FEE_VALUE,
    MIN_BOX_VALUE,
    TOKENID_TEST,
    TEST_SWAP_CONTRACT_ADDRESS,
    TOKENID_FAKE_SIGUSD
} from "../constants/ergo"

import {
    createUnsignedTransaction,
    getTxReducedB64Safe, 
    getUtxosForSelectedInputs, 
    createTxOutputs
} from '../ergo/ergolibUtils'

import {
    Address,
    BoxValue,
    Contract,
    ErgoBoxCandidate,
    ErgoBoxCandidates,
    ErgoBoxCandidateBuilder,
    I64,
    TokenAmount,
    TokenId, 
    Constant} from '../../pkg-nodejs/ergo_lib_wasm'

import { currentHeight } from '../ergo/explorer';
import { getTokenListFromUtxos, parseUtxo } from '../ergo/utxos';
import { ErgoPayResponse, Severity } from "../ergo/ergopayresponse"

export default class SwapController {

    static async SwapSigUSD(req: Request, res: Response): Promise<void> {
        const recipient = req.params.addr
        const sigUSDAmount = req.params.amnt

        const amountToSend = parseFloat(sigUSDAmount)
        let response = new ErgoPayResponse()

        const feeFloat = parseFloat(String(FEE_VALUE/NANOERG_TO_ERG));
        const amountToSendFloat = parseFloat(String(MIN_BOX_VALUE/NANOERG_TO_ERG));
        const totalAmountToSendFloatERG = amountToSendFloat + feeFloat
        const selectedAddressesSender = [recipient]              // from ERG mobile wallet
        const selectedAddressesSC = [TEST_SWAP_CONTRACT_ADDRESS] // smart contract address

        const tokenAmountToSendSender = [amountToSend]

        const tokensToSendSender = [
            {
              amount: amountToSend,
              decimals: '2',
              name: "SigUSD",
              tokenId: TOKENID_FAKE_SIGUSD
            }
        ]

        const tokenAmountToSendIntSender = tokenAmountToSendSender.map((amountFloat: any, id: any) =>
            Math.round(parseFloat(amountFloat.toString()) * Math.pow(10, parseInt(tokensToSendSender[id].decimals))));

        const tokenAmountToSendSC = [tokenAmountToSendIntSender[0]]
        const tokensToSendSC = [
            {
              amount: tokenAmountToSendIntSender[0],
              decimals: '0',
              name: "NO TESTING TOKENS",
              tokenId: TOKENID_TEST
            }
        ]

        const tokenAmountToSendIntSC = tokenAmountToSendSC.map((amountFloat: any, id: any) =>
            Math.round(parseFloat(amountFloat.toString()) * Math.pow(10, parseInt(tokensToSendSC[id].decimals))));


        const selectedUtxosSC = await getUtxosForSelectedInputs(selectedAddressesSC,
                                                                totalAmountToSendFloatERG,
                                                                tokensToSendSC,
                                                                tokenAmountToSendSC);


        const selectedUtxosSender = await getUtxosForSelectedInputs(selectedAddressesSender,
                                                                    totalAmountToSendFloatERG,
                                                                    tokensToSendSender,
                                                                    tokenAmountToSendSender);

        
        const creationHeight = await currentHeight() - 20; // allow some lag between explorer and node
        const amountNano = BigInt(Math.round((amountToSendFloat * NANOERG_TO_ERG)));
        const feeNano =  BigInt(Math.round((feeFloat * NANOERG_TO_ERG)));

        let selectedUtxos: any[] = []
        const scUtxo = getBestUtxoSC(selectedUtxosSC,TOKENID_TEST,tokenAmountToSendIntSC[0])
        const senderUtxo = getBestUtxoSender(selectedUtxosSender,TOKENID_FAKE_SIGUSD,tokenAmountToSendIntSender[0],(amountNano+feeNano))
        selectedUtxos.push(scUtxo)
        selectedUtxos.push(senderUtxo)

        //console.log("scUtxo", scUtxo)
        //console.log("senderUtxo", senderUtxo)

        const outputCandidates = ErgoBoxCandidates.empty();

        let swapBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(recipient)),
            creationHeight);

            swapBox.add_token(TokenId.from_str(TOKENID_TEST),
                TokenAmount.from_i64(I64.from_str(tokenAmountToSendIntSC.toString())
            ));

        outputCandidates.add(swapBox.build());

        const scBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(TEST_SWAP_CONTRACT_ADDRESS)),
            creationHeight)
    
        // calculate final SC token balances
        // OWL tokens needs to be first in the list
        let owlRemainder: number = 0
        let scSigUSDRemainder: number = tokenAmountToSendIntSender[0]
        let tokensRemaining: {tokenId: string, amount: string}[] = []
        for (const i in scUtxo.assets) {
            if (scUtxo.assets[i].tokenId == TOKENID_TEST) {
                owlRemainder = parseInt(scUtxo.assets[i].amount) - tokenAmountToSendIntSC[0]
            } else if (scUtxo.assets[i].tokenId == TOKENID_FAKE_SIGUSD) {
                scSigUSDRemainder += parseInt(scUtxo.assets[i].amount)
            } else {
                tokensRemaining.push({
                    tokenId: scUtxo.assets[i].tokenId,
                    amount: scUtxo.assets[i].amount
                })
            }
        }
        if (owlRemainder > 0) {
            scBox.add_token(TokenId.from_str(TOKENID_TEST),
                TokenAmount.from_i64(I64.from_str(owlRemainder.toString())
            ))
        }
        scBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
            TokenAmount.from_i64(I64.from_str(scSigUSDRemainder.toString())
        ))

        // Add remaining untouched tokens to scBox
        for (const i in tokensRemaining) {
            scBox.add_token(TokenId.from_str(tokensRemaining[i].tokenId),
                TokenAmount.from_i64(I64.from_str(tokensRemaining[i].amount)
            ))
        }
    
        outputCandidates.add(scBox.build());

        // prepare the miner fee box
        const feeBox = ErgoBoxCandidate.new_miner_fee_box(BoxValue.from_i64(I64.from_str(feeNano.toString())), await currentHeight());
        outputCandidates.add(feeBox);

        // prepare changeBox
        const changeAmountNano = BigInt(senderUtxo.value) - amountNano - feeNano;
        let changeBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(changeAmountNano.toString())),
            Contract.pay_to_address(Address.from_base58(recipient)),
            creationHeight);

        // calculate final Sender token balances
        let senderSigUSDRemainder: number = tokenAmountToSendIntSender[0]
        for (const i in senderUtxo.assets) {
            if (senderUtxo.assets[i].tokenId == TOKENID_FAKE_SIGUSD) {
                senderSigUSDRemainder = parseInt(senderUtxo.assets[i].amount) - tokenAmountToSendIntSender[0]
            } else {
                changeBox.add_token(TokenId.from_str(senderUtxo.assets[i].tokenId),
                    TokenAmount.from_i64(I64.from_str(senderUtxo.assets[i].amount)
                ));
            }
        }

        changeBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
            TokenAmount.from_i64(I64.from_str(senderSigUSDRemainder.toString())
        ));

        outputCandidates.add(changeBox.build());

        const unsignedTransaction = await createUnsignedTransaction(selectedUtxos, outputCandidates);

        const jsonUnsignedTx = JSON.parse(unsignedTransaction.to_json());

        let txId: string | RegExpMatchArray | null = ""
        let txReducedB64safe: string | RegExpMatchArray | null = ""
        try {
            [txId, txReducedB64safe] = await getTxReducedB64Safe(jsonUnsignedTx, selectedUtxos);
        } catch(e) {
            console.log("exception caught from getTxReducedB64Safe", e)
        }
        console.log("txId: ", txId)
        console.log("txReducedB64safe: ", txReducedB64safe)

        response.reducedTx = txReducedB64safe
        response.address = recipient
        response.message = `Your swap for ${tokenAmountToSendIntSC} OWL is ready to be placed`
        response.messageSeverity = Severity.INFORMATION

        res.status(200).json(response)
    }

    static async SwapOWL(req: Request, res: Response): Promise<void> {
        const recipient = req.params.addr
        const owlAmount = req.params.amnt

        const amountToSend = parseFloat(owlAmount)
        let response = new ErgoPayResponse()

        const feeFloat = parseFloat(String(FEE_VALUE/NANOERG_TO_ERG));
        const amountToSendFloat = parseFloat(String(MIN_BOX_VALUE/NANOERG_TO_ERG));
        const totalAmountToSendFloatERG = amountToSendFloat + feeFloat
        const selectedAddressesSender = [recipient]              // from ERG mobile wallet
        const selectedAddressesSC = [TEST_SWAP_CONTRACT_ADDRESS] // smart contract address

        const tokenAmountToSendSender = [amountToSend]

        const tokensToSendSender = [
            {
              amount: amountToSend,
              decimals: '0',
              name: "NO TESTING TOKENS",
              tokenId: TOKENID_TEST
            }
        ]

        const tokenAmountToSendIntSender = tokenAmountToSendSender.map((amountFloat: any, id: any) =>
            Math.round(parseFloat(amountFloat.toString()) * Math.pow(10, parseInt(tokensToSendSender[id].decimals))));

        const tokenAmountToSendSC = [tokenAmountToSendIntSender[0]]
        const tokenAmountToSendIntSC = [tokenAmountToSendIntSender[0]]

        const tokensToSendSC = [
            {
              amount: amountToSend,
              decimals: '2',
              name: "SigUSD",
              tokenId: TOKENID_FAKE_SIGUSD
            }
        ]

        const selectedUtxosSC = await getUtxosForSelectedInputs(selectedAddressesSC,
                                                                totalAmountToSendFloatERG,
                                                                tokensToSendSC,
                                                                tokenAmountToSendSC);


        const selectedUtxosSender = await getUtxosForSelectedInputs(selectedAddressesSender,
                                                                    totalAmountToSendFloatERG,
                                                                    tokensToSendSender,
                                                                    tokenAmountToSendSender);

        
        const creationHeight = await currentHeight() - 20; // allow some lag between explorer and node
        const amountNano = BigInt(Math.round((amountToSendFloat * NANOERG_TO_ERG)));
        const feeNano =  BigInt(Math.round((feeFloat * NANOERG_TO_ERG)));

        let selectedUtxos: any[] = []
        const scUtxo = getBestUtxoSC(selectedUtxosSC,TOKENID_FAKE_SIGUSD,tokenAmountToSendIntSC[0])
        const senderUtxo = getBestUtxoSender(selectedUtxosSender,TOKENID_TEST,tokenAmountToSendIntSender[0],(amountNano+feeNano))
        selectedUtxos.push(scUtxo)
        selectedUtxos.push(senderUtxo)

        //console.log("scUtxo", scUtxo)
        //console.log("senderUtxo", senderUtxo)

        const outputCandidates = ErgoBoxCandidates.empty();

        let swapBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(recipient)),
            creationHeight);

            swapBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
                TokenAmount.from_i64(I64.from_str(tokenAmountToSendIntSC.toString())
            ));

        outputCandidates.add(swapBox.build());

        const scBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(TEST_SWAP_CONTRACT_ADDRESS)),
            creationHeight)
    
        // calculate final SC token balances
        // OWL tokens needs to be first in the list
        let owlRemainder: number = tokenAmountToSendIntSender[0]
        let scSigUSDRemainder: number = 0
        let tokensRemaining: {tokenId: string, amount: string}[] = []
        for (const i in scUtxo.assets) {
            if (scUtxo.assets[i].tokenId == TOKENID_TEST) {
                owlRemainder = parseInt(scUtxo.assets[i].amount) + tokenAmountToSendIntSender[0]
            } else if (scUtxo.assets[i].tokenId == TOKENID_FAKE_SIGUSD) {
                scSigUSDRemainder = parseInt(scUtxo.assets[i].amount) - tokenAmountToSendIntSC[0]
            } else {
                tokensRemaining.push({
                    tokenId: scUtxo.assets[i].tokenId,
                    amount: scUtxo.assets[i].amount
                })
            }
        }

        scBox.add_token(TokenId.from_str(TOKENID_TEST),
            TokenAmount.from_i64(I64.from_str(owlRemainder.toString())
        ))
        if (scSigUSDRemainder > 0) {
            scBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
                TokenAmount.from_i64(I64.from_str(scSigUSDRemainder.toString())
            ))
        }

        // Add remaining untouched tokens to scBox
        for (const i in tokensRemaining) {
            scBox.add_token(TokenId.from_str(tokensRemaining[i].tokenId),
                TokenAmount.from_i64(I64.from_str(tokensRemaining[i].amount)
            ))
        }
    
        outputCandidates.add(scBox.build());

        // prepare the miner fee box
        const feeBox = ErgoBoxCandidate.new_miner_fee_box(BoxValue.from_i64(I64.from_str(feeNano.toString())), await currentHeight());
        outputCandidates.add(feeBox);

        // prepare changeBox
        const changeAmountNano = BigInt(senderUtxo.value) - amountNano - feeNano;
        let changeBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(changeAmountNano.toString())),
            Contract.pay_to_address(Address.from_base58(recipient)),
            creationHeight);

        // calculate final Sender token balances
        let senderOwlRemainder: number = tokenAmountToSendIntSender[0]
        for (const i in senderUtxo.assets) {
            if (senderUtxo.assets[i].tokenId == TOKENID_TEST) {
                senderOwlRemainder = parseInt(senderUtxo.assets[i].amount) - tokenAmountToSendIntSender[0]
            } else {
                changeBox.add_token(TokenId.from_str(senderUtxo.assets[i].tokenId),
                    TokenAmount.from_i64(I64.from_str(senderUtxo.assets[i].amount)
                ));
            }
        }

        changeBox.add_token(TokenId.from_str(TOKENID_TEST),
            TokenAmount.from_i64(I64.from_str(senderOwlRemainder.toString())
        ));

        outputCandidates.add(changeBox.build());

        const unsignedTransaction = await createUnsignedTransaction(selectedUtxos, outputCandidates);

        const jsonUnsignedTx = JSON.parse(unsignedTransaction.to_json());

        let txId: string | RegExpMatchArray | null = ""
        let txReducedB64safe: string | RegExpMatchArray | null = ""
        try {
            [txId, txReducedB64safe] = await getTxReducedB64Safe(jsonUnsignedTx, selectedUtxos);
        } catch(e) {
            console.log("exception caught from getTxReducedB64Safe", e)
        }
        console.log("txId: ", txId)
        console.log("txReducedB64safe: ", txReducedB64safe)

        response.reducedTx = txReducedB64safe
        response.address = recipient
        response.message = `Your swap for ${tokenAmountToSendIntSC[0]/100} SigUSD is ready to be placed`
        response.messageSeverity = Severity.INFORMATION

        res.status(200).json(response)
    }
}

function getBestUtxoSC(utxos: any[], tokenId: string, tokenAmount: number): any {
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
                u_parsed.assets[t].amount >= tokenAmount) {
                return utxos[u]
            }
        }
    }
}

function getBestUtxoSender(utxos: any[], tokenId: string, tokenAmount: number, fees: bigint): any {
    // grab 1 or more utxos from the input utxos that has enough available tokens
    for (const u in utxos) {
        const u_parsed = parseUtxo(utxos[u])
        // check if there is enough ERG in the box to fulfill the tx fees
        if (BigInt(u_parsed.value) >= fees) {
            for (const t in u_parsed.assets) {
                if (u_parsed.assets[t].tokenId == tokenId &&
                    u_parsed.assets[t].amount >= tokenAmount) {
                    return utxos[u]
                }
            }
        }
    }
}