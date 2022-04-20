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
    getBestUtxoSC,
    getBestUtxoSender,
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
import { getTokenListFromUtxos, parseUtxo, enrichUtxos } from '../ergo/utxos';
import { ergoTreeToAddress } from "../ergo/serializer";
import logger from "../logger"
import {v4 as uuidv4} from 'uuid'

const feeFloat = parseFloat(String(FEE_VALUE/NANOERG_TO_ERG));
const amountToSendFloat = parseFloat(String(MIN_BOX_VALUE/NANOERG_TO_ERG));

export default class SwapController {

    static async SwapSigUSD(req: Request, res:Response): Promise<void> {
        const profiler = logger.startTimer();
        const uuid = uuidv4()
        const swapOwlLogger = logger.child({ request_id: `${uuid}` });
        swapOwlLogger.info('', {
            url: '/api/v1/swap/sigusd',
            sender_addr: `${req.body.senderAddr}`,
            sender_amnt: `${req.body.amnt}`,
        });

        const recipient = req.body.senderAddr
        const amountToSend: number = req.body.amnt
        const selectedUtxosSender = req.body.utxos
        const totalAmountToSendFloatERG = amountToSendFloat + feeFloat
        const selectedAddressesSC = [TEST_SWAP_CONTRACT_ADDRESS] // smart contract address

        const tokensToSendSC = [
            {
              amount: amountToSend,
              decimals: '0',
              name: "NO TESTING TOKENS",
              tokenId: TOKENID_TEST
            }
        ]

        const selectedUtxosSC = await getUtxosForSelectedInputs(selectedAddressesSC,
                                                                totalAmountToSendFloatERG,
                                                                tokensToSendSC,
                                                                [amountToSend]);

        const creationHeight = await currentHeight();
        const amountNano = BigInt(Math.round((amountToSendFloat * NANOERG_TO_ERG)));
        const feeNano =  BigInt(Math.round((feeFloat * NANOERG_TO_ERG)));

        let selectedUtxos: any[] = []
        const scUtxo = getBestUtxoSC(selectedUtxosSC,TOKENID_TEST,amountToSend)
        // SAFEW REQ
        //const enrichedUtxo = await enrichUtxos([scUtxo], true)
        const senderUtxo = getBestUtxoSender(selectedUtxosSender,TOKENID_FAKE_SIGUSD,amountToSend,(amountNano+feeNano))
        selectedUtxos.push(scUtxo)
        selectedUtxos.push(senderUtxo)

        const outputCandidates = ErgoBoxCandidates.empty();

        let swapBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(recipient)),
            creationHeight);

        swapBox.add_token(TokenId.from_str(TOKENID_TEST),
            TokenAmount.from_i64(I64.from_str(amountToSend.toString())
        ));

        outputCandidates.add(swapBox.build());

        const scBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(TEST_SWAP_CONTRACT_ADDRESS)),
            creationHeight)
    
        // calculate final SC token balances
        // OWL tokens needs to be first in the list
        let owlRemainder: number = 0
        let sigUSDTotal: number = 0
        let tokensRemaining: {tokenId: string, amount: string}[] = []
        for (const i in scUtxo.assets) {
            if (scUtxo.assets[i].tokenId == TOKENID_TEST) {
                owlRemainder = parseInt(scUtxo.assets[i].amount) - Number(amountToSend)
            } else if (scUtxo.assets[i].tokenId == TOKENID_FAKE_SIGUSD) {
                sigUSDTotal = Number(amountToSend) + parseInt(scUtxo.assets[i].amount)
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
            TokenAmount.from_i64(I64.from_str(sigUSDTotal.toString())
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
        let senderSigUSDRemainder: number = amountToSend
        for (const i in senderUtxo.assets) {
            if (senderUtxo.assets[i].tokenId == TOKENID_FAKE_SIGUSD) {
                senderSigUSDRemainder = parseInt(senderUtxo.assets[i].amount) - amountToSend
            } else {
                changeBox.add_token(TokenId.from_str(senderUtxo.assets[i].tokenId),
                    TokenAmount.from_i64(I64.from_str(senderUtxo.assets[i].amount.toString())
                ));
            }
        }

        if (senderSigUSDRemainder > 0) {
            changeBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
                TokenAmount.from_i64(I64.from_str(senderSigUSDRemainder.toString())
            ));
        }

        outputCandidates.add(changeBox.build());

        const unsignedTransaction = await createUnsignedTransaction(selectedUtxos, outputCandidates);

        let jsonUnsignedTx = JSON.parse(unsignedTransaction.to_json());

        let txId: string | RegExpMatchArray | null = ""
        let txReducedB64safe: string | RegExpMatchArray | null = ""
        try {
            [txId, txReducedB64safe] = await getTxReducedB64Safe(jsonUnsignedTx, selectedUtxos);
        } catch(e) {
            console.log("exception caught from getTxReducedB64Safe", e)
        }

        jsonUnsignedTx.inputs = selectedUtxos

        // set extension: {}
        for (const i in jsonUnsignedTx.inputs) {
            jsonUnsignedTx.inputs[i].extension = {}
        }
        // SAFEW REQ: Set assets to empty array
        //for (const o in jsonUnsignedTx.outputs) {
        //    if (jsonUnsignedTx.outputs[o].assets == null) {
        //        jsonUnsignedTx.outputs[o].assets = []
        //    }
        //    jsonUnsignedTx.outputs[o].extension = {}
        //    jsonUnsignedTx.outputs[o].address = await ergoTreeToAddress(jsonUnsignedTx.outputs[o].ergoTree);
        //}

        //console.log("jsonUnsignedTx: ", jsonUnsignedTx)

        profiler.done({
            hostname: `${swapOwlLogger.defaultMeta.hostname}`,
            request_id: `${uuid}`,
            tx_id: `${txId}`,
            code: 200
        })
        res.status(200).json(jsonUnsignedTx)
    }

    static async SwapOWL(req: Request, res:Response): Promise<void> {
        const profiler = logger.startTimer();
        const uuid = uuidv4()
        const swapOwlLogger = logger.child({ request_id: `${uuid}` });
        
        swapOwlLogger.info('', {
            url: '/api/v1/swap/owl',
            sender_addr: `${req.body.senderAddr}`,
            sender_amnt: `${req.body.amnt}`,
        });

        const recipient = req.body.senderAddr
        const amountToSend: number = req.body.amnt
        const selectedUtxosSender = req.body.utxos
        const totalAmountToSendFloatERG = amountToSendFloat + feeFloat
        const selectedAddressesSC = [TEST_SWAP_CONTRACT_ADDRESS] // smart contract address

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
                                                                [amountToSend]);

        const creationHeight = await currentHeight();
        const amountNano = BigInt(Math.round((amountToSendFloat * NANOERG_TO_ERG)));
        const feeNano =  BigInt(Math.round((feeFloat * NANOERG_TO_ERG)));

        let selectedUtxos: any[] = []
        const scUtxo = getBestUtxoSC(selectedUtxosSC,TOKENID_FAKE_SIGUSD,amountToSend)
        if (scUtxo === undefined) {
            profiler.done({
                hostname: `${swapOwlLogger.defaultMeta.hostname}`,
                request_id: `${uuid}`,
                tx_id: ``,
                message: "Couldn't find a smart contract utxo",
                code: 500
            })
            res.status(500).json()
            return
        }
        // SAFEW REQ
        //const enrichedUtxo = await enrichUtxos([scUtxo], true)
        const senderUtxo = getBestUtxoSender(selectedUtxosSender,TOKENID_TEST,amountToSend,(amountNano+feeNano))
        selectedUtxos.push(scUtxo)
        selectedUtxos.push(senderUtxo)

        const outputCandidates = ErgoBoxCandidates.empty();

        let swapBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(recipient)),
            creationHeight);

        swapBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
            TokenAmount.from_i64(I64.from_str(amountToSend.toString())
        ));

        outputCandidates.add(swapBox.build());

        const scBox = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(amountNano.toString())),
            Contract.pay_to_address(Address.from_base58(TEST_SWAP_CONTRACT_ADDRESS)),
            creationHeight)
    
        // calculate final SC token balances
        // OWL tokens needs to be first in the list
        let sigUSDRemainder: number = 0
        let owlTotal: number = 0
        let tokensRemaining: {tokenId: string, amount: string}[] = []
        for (const i in scUtxo.assets) {
            if (scUtxo.assets[i].tokenId == TOKENID_TEST) {
                owlTotal = Number(amountToSend) + parseInt(scUtxo.assets[i].amount)
            } else if (scUtxo.assets[i].tokenId == TOKENID_FAKE_SIGUSD) {
                sigUSDRemainder = parseInt(scUtxo.assets[i].amount) - Number(amountToSend)
            } else {
                tokensRemaining.push({
                    tokenId: scUtxo.assets[i].tokenId,
                    amount: scUtxo.assets[i].amount
                })
            }
        }

        scBox.add_token(TokenId.from_str(TOKENID_TEST),
          TokenAmount.from_i64(I64.from_str(owlTotal.toString())
        ))

        if (sigUSDRemainder > 0) {
            scBox.add_token(TokenId.from_str(TOKENID_FAKE_SIGUSD),
                TokenAmount.from_i64(I64.from_str(sigUSDRemainder.toString())
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
        let senderOWLRemainder: number = amountToSend
        for (const i in senderUtxo.assets) {
            if (senderUtxo.assets[i].tokenId == TOKENID_TEST) {
                senderOWLRemainder = parseInt(senderUtxo.assets[i].amount) - amountToSend
            } else {
                changeBox.add_token(TokenId.from_str(senderUtxo.assets[i].tokenId),
                    TokenAmount.from_i64(I64.from_str(senderUtxo.assets[i].amount.toString())
                ));
            }
        }

        if (senderOWLRemainder > 0) {
            changeBox.add_token(TokenId.from_str(TOKENID_TEST),
                TokenAmount.from_i64(I64.from_str(senderOWLRemainder.toString())
            ));
        }

        outputCandidates.add(changeBox.build());

        const unsignedTransaction = await createUnsignedTransaction(selectedUtxos, outputCandidates);

        let jsonUnsignedTx = JSON.parse(unsignedTransaction.to_json());

        let txId: string | RegExpMatchArray | null = ""
        let txReducedB64safe: string | RegExpMatchArray | null = ""
        try {
            [txId, txReducedB64safe] = await getTxReducedB64Safe(jsonUnsignedTx, selectedUtxos);
        } catch(e) {
            logger.error(`err=${e}`)
        }

        jsonUnsignedTx.inputs = selectedUtxos

        // set extension: {}
        for (const i in jsonUnsignedTx.inputs) {
            jsonUnsignedTx.inputs[i].extension = {}
        }
        // SAFEW REQ: Set assets to empty array
        //for (const o in jsonUnsignedTx.outputs) {
        //    if (jsonUnsignedTx.outputs[o].assets == null) {
        //        jsonUnsignedTx.outputs[o].assets = []
        //    }
        //    jsonUnsignedTx.outputs[o].extension = {}
        //    jsonUnsignedTx.outputs[o].address = await ergoTreeToAddress(jsonUnsignedTx.outputs[o].ergoTree);
        //}

        //console.log("jsonUnsignedTx: ", jsonUnsignedTx)
        
        profiler.done({
            hostname: `${swapOwlLogger.defaultMeta.hostname}`,
            request_id: `${uuid}`,
            tx_id: `${txId}`,
            code: 200
        })
        res.status(200).json(jsonUnsignedTx)
    }
}