import { Request, Response } from "express"
import { ErgoPayReply } from "../ergo/ergopayreply"
import { Severity } from "../ergo/ergopayresponse"
import ErgoPayResponse from "../ergo/ergopayresponse"
import {
    Address,
    BoxId,
    BoxValue,
    Contract,
    DataInputs,
    ErgoBoxCandidate,
    ErgoBoxCandidates,
    ErgoBoxCandidateBuilder,
    ErgoBoxes,
    I64,
    Tokens,
    TxBuilder,
    UnsignedInput, 
    UnsignedInputs,
    UnsignedTransaction,
    Wallet
  } from "ergo-lib-wasm-nodejs";
import { explorerService } from "../explorer/explorerService"

export default class ErgoPayController {
    
    public static paymentTransaction(
        recipientAddress: Address,
        changeAddress: Address,
        transferAmt: string,
        feeAmt: BoxValue,
        changeAmt: BoxValue,
        inputIds: string[],
        currentHeight: number,
    ): UnsignedTransaction {
        /*const payTo = new ErgoBoxCandidateBuilder(
            BoxValue.from_i64(I64.from_str(transferAmt)),
            Contract.pay_to_address(recipientAddress),
            currentHeight
        ).build();
        const change = new ErgoBoxCandidateBuilder(
            changeAmt,
            Contract.pay_to_address(changeAddress),
            currentHeight
        ).build();
        const fee = ErgoBoxCandidate.new_miner_fee_box(feeAmt, currentHeight);
    
        const unsignedInputArray = inputIds.map(BoxId.from_str).map(UnsignedInput.from_box_id)
        const unsignedInputs = new UnsignedInputs();
        unsignedInputArray.forEach((i) => unsignedInputs.add(i));
    
        const outputs = new ErgoBoxCandidates(payTo);
    
        if (change.value().as_i64().as_num() > 0) {
            outputs.add(change);    
        }
    
        outputs.add(fee);*/

        let unsignedTx = new UnsignedTransaction()
        //unsignedTx.inputs = unsignedInputs
        //unsignedTx.data_inputs = new DataInputs
        //unsignedTx.output_candidates = outputs

        return unsignedTx
    }
    
    static async ErgoPayRoundTrip(req: Request, res: Response): Promise<void> {
        
        // node endpoint http://213.239.193.208:9053/
        // ergo mobile wallet addr - 9giLg8jEtqZjADgu4dhL78fGK7BDqJvy9ZcnNsaZVxxKod4Vp6s

        // Get address from URI GET request
        let addr = req.params.addr || ""
        let bet = req.params.bet || ""
        console.log(`addr: ${addr}`)
        console.log(`bet: ${bet}`)
        let amountToSend: BigInt = BigInt(bet)
        let response = new ErgoPayResponse()
        let amount = BigInt(1000)
        

        if (addr != "") {
            let _boxes = await explorerService.getUnspentBoxes(new Array(addr))

            // Get currentHeight from first box
            amountToSend = amount * amount * amount      // This equals out to 1 ERG
            const boxData = _boxes[0]?.data || 0
            const currentHeight = boxData[0].creationHeight
            const recipient = Address.from_mainnet_str(addr)
            const sender = Address.from_mainnet_str(addr)  // We are sending ERG to ourselves
            const feeAmt = TxBuilder.SUGGESTED_TX_FEE();
            const changeAmt = BoxValue.SAFE_USER_MIN();
            const myInputs: string[] = [];
            
            /*const unsignedTx: any = this.paymentTransaction(
                               recipient,
                               sender,
                               String(amountToSend),
                               feeAmt,
                               changeAmt,
                               myInputs,
                               currentHeight);*/


            
            /*response.reducedTx = Buffer.from(unsignedTx.to_json, 'binary').toString('base64');
            response.address = addr*/
            response.message = `Your bet of ${bet} has been placed`
            response.messageSeverity = Severity.INFORMATION
        }
        
        res.status(200).json(response);
    }

    static async ErgoPayReply(req: Request, res: Response): Promise<void> {
        let txId = req.params.txId
        console.log(`wallet app replied with txId: ${txId}`)
        res.status(200)
    }
}