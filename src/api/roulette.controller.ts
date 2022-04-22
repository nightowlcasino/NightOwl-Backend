import { Request, Response } from "express"
import logger from "../logger"
import {v4 as uuidv4} from 'uuid'

import {
  NANOERG_TO_ERG,
  FEE_VALUE,
  MIN_BOX_VALUE,
  TOKENID_TEST,
  TOKENID_FAKE_WITNESS,
  TOKENID_FAKE_LP,
  TEST_GAME_WITNESS_CONTRACT_ADDRESS,
  TEST_HOUSE_CONTRACT_ADDRESS,
  TEST_RESULT_CONSTANT_ADDRESS
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
  ErgoTree,
  I64,
  NonMandatoryRegisterId,
  TokenAmount,
  TokenId, 
  Constant
} from '../../pkg-nodejs/ergo_lib_wasm'

import { currentHeight } from '../ergo/explorer';
import { RouletteGame } from "../models/roulettegame"

/*
rouletteGame = {
  txFee: minBoxValue * (# of bets) + minerFee,
  totalWager: XX OWLs,
  bets: [
  // Red/Black
    {
      r4: 0,
      r5: 0 (red) or 1 (black),
      multiplier: 1,
      amount: XX,
    },
    // Odd/Even
    {
      r4: 1,
      r5: 0 (even) or 1 (odd),
      multiplier: 1,
      amount: XX,
    },
    // Lower Half/Upper Half
    {
      r4: 2,
      r5: 10 (1-18) or 28 (19-36),
      multiplier: 1,
      amount: XX,
    },
    // Columns
    {
      r4: 3,
      r5: 1 (1st column) or 2 (2nd column) or 3 (3rd column),
      multiplier: 2,
      amount: XX,
    },
    // Lower third/ Mid third/ Upper third
    {
      r4: 4,
      r5: 6 (1-12) or 18 (13-24) or 30 (25-36),
      multiplier: 2,
      amount: XX,
    },
    // Exact Number
    {
      r4: 5,
      r5: 0...36,
      multiplier: 35,
      amount: XX,
    }
    ...
  ]
}
*/

const feeFloat = parseFloat(String(FEE_VALUE/NANOERG_TO_ERG));
const amountToSendFloat = parseFloat(String(MIN_BOX_VALUE/NANOERG_TO_ERG));

export default class RouletteController {
  static async Spin(req: Request, res:Response): Promise<void> {
    const profiler = logger.startTimer();
    const uuid = uuidv4()
    const rouletteLogger = logger.child({ request_id: `${uuid}` });
    let gameRequest: string = ""
    
    try {
      gameRequest = JSON.stringify(req.body.game)
    } catch(e) {
      console.log(e)
    }

    rouletteLogger.info('', {
        url: '/api/v1/roulette/spin',
        sender_addr: `${req.body.senderAddr}`,
        sender_game: `${gameRequest}`,
    });

    console.log(req.body.game)

    const recipient = req.body.senderAddr
    const rouletteGame = req.body.game
    const selectedUtxosSender = req.body.utxos

    const totalAmountToSendFloatERG = amountToSendFloat + feeFloat

    /*
    rouletteGame = {
      txFee: 2100000,
      totalWager: 10 OWLs,
      bets: [
        // Odd/Even
        {
          r4: 1,
          r5: 0 (even) or 1 (odd),
          multiplier: 1,
          amount: 10,
        }
      ]
    }
    */

    let housePayout: number = 0
    rouletteGame.bets.forEach((element: any) => {
      housePayout = housePayout + (element.multiplier * element.amount)
    });

    const gameWitnessTokens = [
      {
        amount: 1,
        decimals: '0',
        name: "Fake Witness Token",
        tokenId: TOKENID_FAKE_WITNESS
      }
    ]

    const houseContractTokens = [
      {
        amount: housePayout,
        decimals: '0',
        name: "NO TESTING TOKENS",
        tokenId: TOKENID_TEST
      }
    ]

    // Game Witness Input UTXO
    const gameWitnessUtxos = await getUtxosForSelectedInputs([TEST_GAME_WITNESS_CONTRACT_ADDRESS],
                                                             amountToSendFloat,
                                                             gameWitnessTokens,
                                                             [1]);

    // House Contract Input UTXO
    const houseContractUtxos = await getUtxosForSelectedInputs([TEST_HOUSE_CONTRACT_ADDRESS],
                                                               amountToSendFloat,
                                                               houseContractTokens,
                                                               [housePayout]);

    //console.log("gameWitnessUtxos")
    //console.log(gameWitnessUtxos[0])
    //console.log("houseContractUtxos")
    //console.log(houseContractUtxos[0])

    const creationHeight = await currentHeight();
    const amountNano = BigInt(MIN_BOX_VALUE);
    const feeNano =  BigInt(FEE_VALUE);

    // Player Input UTXO
    // SAFEW REQ
    //const enrichedUtxo = await enrichUtxos([scUtxo], true)
    const senderUtxo = getBestUtxoSender(selectedUtxosSender,TOKENID_TEST,rouletteGame.totalWager,(amountNano+feeNano))

    let selectedUtxos: any[] = []
    selectedUtxos.push(gameWitnessUtxos[0])
    selectedUtxos.push(houseContractUtxos[0])
    selectedUtxos.push(senderUtxo)

    //console.log(senderUtxo)

    const outputCandidates = ErgoBoxCandidates.empty();

    let gameWitnessBox = new ErgoBoxCandidateBuilder(
        BoxValue.from_i64(I64.from_str(gameWitnessUtxos[0].value)),
        Contract.pay_to_address(Address.from_base58(TEST_GAME_WITNESS_CONTRACT_ADDRESS)),
        creationHeight);

        gameWitnessBox.add_token(TokenId.from_str(TOKENID_FAKE_WITNESS),
        TokenAmount.from_i64(I64.from_str("1")
    ));

    outputCandidates.add(gameWitnessBox.build());

    const houseContractBox = new ErgoBoxCandidateBuilder(
        BoxValue.from_i64(I64.from_str(houseContractUtxos[0].value)),
        Contract.pay_to_address(Address.from_base58(TEST_HOUSE_CONTRACT_ADDRESS)),
        creationHeight)

    // Keep the same LP Tokens in Assets[0]
    houseContractBox.add_token(TokenId.from_str(TOKENID_FAKE_LP),
        TokenAmount.from_i64(I64.from_str(houseContractUtxos[0].assets[0].amount.toString())
    ))
    
    // deduct OWL multiplier from Assets[1]
    let owlRemainder: number = Number(houseContractUtxos[0].assets[1].amount)
    owlRemainder = owlRemainder - housePayout
    if (owlRemainder > 0) {
      houseContractBox.add_token(TokenId.from_str(TOKENID_TEST),
          TokenAmount.from_i64(I64.from_str(owlRemainder.toString())
      ))
    }

    // Add remaining untouched tokens to houseContractBox if they exists
    houseContractUtxos[0].assets.forEach((element: any) => {
      if (element.tokenId !== TOKENID_FAKE_LP && element.tokenId !== TOKENID_TEST) {
        houseContractBox.add_token(TokenId.from_str(element.tokenId),
          TokenAmount.from_i64(I64.from_str(element.amount.toString())
        ))
      }
    });
    
    outputCandidates.add(houseContractBox.build());

    const boxValue = MIN_BOX_VALUE / 2
    // prepare result contract(s)
    rouletteGame.bets.forEach((element: any) => {
      const resultContractBox = new ErgoBoxCandidateBuilder(
        BoxValue.from_i64(I64.from_str(boxValue.toString())),
        Contract.pay_to_address(Address.from_base58(TEST_RESULT_CONSTANT_ADDRESS)),
        creationHeight)

      // OWL bet amount
      resultContractBox.add_token(TokenId.from_str(TOKENID_TEST),
        TokenAmount.from_i64(I64.from_str(element.amount.toString())
      ))

      // Set Registers
      resultContractBox.set_register_value(NonMandatoryRegisterId.R4, Constant.from_i32(Number(element.r4)))
      resultContractBox.set_register_value(NonMandatoryRegisterId.R5, Constant.from_i32(Number(element.r5)))
      try {
        //const senderErgoTree = ErgoTree.from_base16_bytes(senderUtxo.ergoTree)
        //console.log(senderErgoTree)
        resultContractBox.set_register_value(NonMandatoryRegisterId.R6, Constant.decode_from_base16(senderUtxo.ergoTree))
      } catch(e) {
        console.log(e)
      }

      outputCandidates.add(resultContractBox.build())
    })

    // prepare the miner fee box
    const feeBox = ErgoBoxCandidate.new_miner_fee_box(BoxValue.from_i64(I64.from_str(feeNano.toString())), creationHeight);
    outputCandidates.add(feeBox);

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

    profiler.done({
      hostname: `${rouletteLogger.defaultMeta.hostname}`,
      request_id: `${uuid}`,
      tx_id: `${txId}`,
      code: 200
    })
    res.status(200).json(jsonUnsignedTx)

  }
}