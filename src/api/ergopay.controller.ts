import { Request, Response } from "express"
import { ErgoPayReply } from "../ergo/ergopayreply"
import { NANOERG_TO_ERG, FEE_VALUE, TOKENID_TEST } from "../constants/ergo"
import { ErgoPayResponse, Severity } from "../ergo/ergopayresponse"
import {
    createUnsignedTransaction,
    getTxReducedB64Safe, 
    getUtxosForSelectedInputs, 
    createTxOutputs 
} from '../ergo/ergolibUtils'

import {
    ErgoBoxCandidates
} from '../../pkg-nodejs/ergo_lib_wasm'

export default class ErgoPayController {

    static async ErgoPayCoinflip(req: Request, res: Response): Promise<void> {
        let addr = req.params.addr || ""
        let bet = req.params.bet || ""
        let response = new ErgoPayResponse()
        let amountToSend: number
        try {
            amountToSend = parseFloat(bet)
            // Need to include error checks here
            //if (amountToSend) {
            //    throw new Error()
            //}
        } catch (e) {
            response.message = `Issue parsing ${bet} value, please use a standard float or int`
            response.messageSeverity = Severity.ERROR
            res.status(200).json(response);
            return
        }
        
        if (addr != "") {
            const recipient = "..." //smart contract address
            const sender = addr  // Comes from ERG mobile wallet
            const feeFloat = parseFloat(String(FEE_VALUE/NANOERG_TO_ERG));
            const totalAmountToSendFloat = amountToSend + feeFloat;
            const selectedAddresses = [addr]
            const tokensToSend = [{
                amount: amountToSend,
                decimals: '0',
                name: "NO TESTING TOKENS",
                tokenId: TOKENID_TEST
            }]

            /*const tokenAmountToSend = [{
                amountFloat: amountToSend,
                id: TOKENID_TEST
            }]*/
            const tokenAmountToSend = [amountToSend]
            const selectedUtxos = await getUtxosForSelectedInputs(selectedAddresses,
                                                                  totalAmountToSendFloat,
                                                                  tokensToSend,
                                                                  tokenAmountToSend);

            const tokenAmountToSendInt = tokenAmountToSend.map((amountFloat: any, id: any) =>
            Math.round(parseFloat(amountFloat.toString()) * Math.pow(10, parseInt(tokensToSend[id].decimals))));

            let outputCandidates: ErrorConstructor | ErgoBoxCandidates
            try {
                outputCandidates = await createTxOutputs(selectedUtxos, recipient, sender,
                    .001, feeFloat, tokensToSend, tokenAmountToSendInt);
            } catch (e) {
                response.message = `Issue building Tx, please try again`
                response.messageSeverity = Severity.ERROR
                res.status(200).json(response);
                return
            }

            const unsignedTransaction = await createUnsignedTransaction(selectedUtxos, outputCandidates);
            const jsonUnsignedTx = JSON.parse(unsignedTransaction.to_json());
            //console.log("sendTransaction unsignedTransaction", jsonUnsignedTx);
            //console.log("outputs", jsonUnsignedTx.outputs[0]);
            //console.log("outputs", jsonUnsignedTx.outputs[2]);

            const [txId, txReducedB64safe] = await getTxReducedB64Safe(jsonUnsignedTx, selectedUtxos);
            console.log("txId: ", txId)
            //console.log("txReducedB64safe: ", txReducedB64safe)
            
            response.reducedTx = txReducedB64safe
            response.address = addr
            response.message = `Your ${bet} OWL send Tx is ready to be placed`
            response.messageSeverity = Severity.INFORMATION
        }
        
        res.status(200).json(response);
    }

    static async ErgoPayReply(req: Request, res: Response): Promise<void> {
        let txId = req.params.txId
        const reply = new ErgoPayReply(txId)
        console.log(`wallet app replied with txId: ${txId}`)
        res.status(200).json(reply)
    }
}