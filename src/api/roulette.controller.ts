import { Request, Response } from "express"
import logger from "../logger"
import { v4 as uuidv4 } from 'uuid'

import {
  NANOERG_TO_ERG,
  FEE_VALUE,
  MIN_BOX_VALUE,
  TOKENID_FAKE_OWL,
  TOKENID_FAKE_WITNESS,
  TOKENID_FAKE_LP,
  TEST_GAME_WITNESS_CONTRACT_ADDRESS,
  TEST_HOUSE_CONTRACT_ADDRESS,
  TEST_ROULETTE_RESULT_CONTRACT_ADDRESS
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

import { currentHeight } from '../ergo/explorer'
import { getErrorMessage } from '../utils/error'
import { getTokenListFromUtxos, parseUtxo, enrichUtxos } from '../ergo/utxos'
import {
  RouletteGame,
  Bet,
  Subgame,
} from "../models/roulettegame"

/*
rouletteGame = {
  txFee: minBoxValue * (# of bets) + minerFee + changeBoxFee + houseResultFee,
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

const amountToSendFloat = parseFloat(String(MIN_BOX_VALUE / NANOERG_TO_ERG));
const betTxUrl = '/api/v1/roulette/bet-tx'
const calcWinnerUrl = '/api/v1/roulette/calculate-winner'
const game = 'roulette'

export default class RouletteController {
  static async BetTx(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();
    const uuid = uuidv4()
    let boardRequest: string = ""
    let utxos: string = ""

    try {
      boardRequest = JSON.stringify(req.body.board)
    } catch (e) {
      logger.error({
        message: 'board value incorrect from roulette bet build request',
        session_id: uuid,
        sender_addr: `${req.body.senderAddr}`,
        error: getErrorMessage(e),
        game: game,
        code: 500,
        url: betTxUrl,
      });
      res.status(500).json("board value incorrect")
      return
    }

    try {
      utxos = JSON.stringify(req.body.utxos)
    } catch (e) {
      logger.error({
        message: 'utxos value incorrect from roulette bet build request',
        session_id: uuid,
        sender_addr: `${req.body.senderAddr}`,
        error: getErrorMessage(e),
        game: game,
        code: 500,
        url: betTxUrl,
      });
      res.status(500).json("utxos value incorrect")
      return
    }

    logger.info({
      message: 'validate roulette bet build tx requested',
      session_id: uuid,
      sender_addr: `${req.body.senderAddr}`,
      sender_bets: boardRequest,
      utxos: utxos,
      game: game,
      url: betTxUrl,
    });

    const recipient = req.body.senderAddr
    const rouletteGame = req.body.board
    const selectedUtxosSender = req.body.utxos

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
      housePayout = housePayout + Number(element.multiplier * element.amount)
    });

    const gameWitnessTokens = [
      {
        amount: 1,
        decimals: '0',
        name: "GameNft",
        tokenId: TOKENID_FAKE_WITNESS
      }
    ]

    const houseContractTokens = [
      {
        amount: housePayout,
        decimals: '0',
        name: "Test Owl Fake",
        tokenId: TOKENID_FAKE_OWL
      },
      {
        amount: 100000000,
        decimals: '0',
        name: "Test Owl LP",
        tokenId: TOKENID_FAKE_LP
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
      [housePayout, 100000000]);

    const creationHeight = await currentHeight();
    const houseResultValue = BigInt(MIN_BOX_VALUE)
    const betValue = BigInt(MIN_BOX_VALUE)
    const feeBoxValue = BigInt(FEE_VALUE)

    let inputUtxos = new Array()
    let outputUtxos = new Array()
    inputUtxos = JSON.parse(JSON.stringify(selectedUtxosSender));
    outputUtxos = JSON.parse(JSON.stringify(selectedUtxosSender));

    // SAFEW REQ
    //const enrichedUtxo = await enrichUtxos([scUtxo], true)
    inputUtxos.unshift(houseContractUtxos[0])
    inputUtxos.unshift(gameWitnessUtxos[0])

    const outputCandidates = ErgoBoxCandidates.empty();

    let gameWitnessBox = new ErgoBoxCandidateBuilder(
      BoxValue.from_i64(I64.from_str(gameWitnessUtxos[0].value)),
      Contract.pay_to_address(Address.from_base58(TEST_GAME_WITNESS_CONTRACT_ADDRESS)),
      creationHeight);

    gameWitnessBox.add_token(TokenId.from_str(gameWitnessUtxos[0].assets[0].tokenId.toString()),
      TokenAmount.from_i64(I64.from_str(gameWitnessUtxos[0].assets[0].amount.toString())
      ));

    outputCandidates.add(gameWitnessBox.build());

    // prepare house contract
    const houseContractBox = new ErgoBoxCandidateBuilder(
      BoxValue.from_i64(I64.from_str(houseContractUtxos[0].value)),
      Contract.pay_to_address(Address.from_base58(TEST_HOUSE_CONTRACT_ADDRESS)),
      creationHeight)

    // Keep the same LP Tokens in Assets[0]
    houseContractBox.add_token(TokenId.from_str(TOKENID_FAKE_LP),
      TokenAmount.from_i64(I64.from_str(houseContractUtxos[0].assets[0].amount.toString())
      ))

    // deduct total OWL multiplier from Assets[1]
    let owlRemainder: number = Number(houseContractUtxos[0].assets[1].amount)
    owlRemainder = owlRemainder - housePayout
    if (owlRemainder > 0) {
      houseContractBox.add_token(TokenId.from_str(TOKENID_FAKE_OWL),
        TokenAmount.from_i64(I64.from_str(owlRemainder.toString())
        ))
    }

    // Add remaining untouched tokens to houseContractBox if they exists
    houseContractUtxos[0].assets.forEach((element: any) => {
      if (element.tokenId !== TOKENID_FAKE_LP && element.tokenId !== TOKENID_FAKE_OWL) {
        houseContractBox.add_token(TokenId.from_str(element.tokenId),
          TokenAmount.from_i64(I64.from_str(element.amount.toString())
          ))
      }
    });

    outputCandidates.add(houseContractBox.build());

    // prepare result contract(s)
    let boxValue: BigInt
    rouletteGame.bets.forEach((bet: any, index: number) => {
      if (index === 0) {
        boxValue = betValue + houseResultValue
      } else {
        boxValue = betValue
      }
      const resultContractBox = new ErgoBoxCandidateBuilder(
        BoxValue.from_i64(I64.from_str(boxValue.toString())),
        Contract.pay_to_address(Address.from_base58(TEST_ROULETTE_RESULT_CONTRACT_ADDRESS)),
        creationHeight)

      // OWL player bet amount + house multiplier
      const houseEscrow = Number(bet.amount) + Number(bet.amount * bet.multiplier)
      resultContractBox.add_token(TokenId.from_str(TOKENID_FAKE_OWL),
        TokenAmount.from_i64(I64.from_str(houseEscrow.toString())
        ))

      // Set Registers
      resultContractBox.set_register_value(NonMandatoryRegisterId.R4, Constant.from_i32(Number(bet.r4)))
      resultContractBox.set_register_value(NonMandatoryRegisterId.R5, Constant.from_i32(Number(bet.r5)))
      const senderErgoTree = ErgoTree.from_base16_bytes(selectedUtxosSender[0].ergoTree).sigma_serialize_bytes()
      resultContractBox.set_register_value(NonMandatoryRegisterId.R6, Constant.from_byte_array(senderErgoTree))

      outputCandidates.add(resultContractBox.build())
    })

    // prepare change box
    // sum all token amounts from inputs
    let totalErg: number = 0
    let inputAssets: any = []
    outputUtxos.forEach((box: any) => {
      totalErg = totalErg + Number(box.value)
      box.assets.forEach((asset: any) => {
        let found = false
        inputAssets.forEach((inputAsset: any, index: number) => {
          if (asset.tokenId == inputAsset.tokenId) {
            found = true
            inputAssets[index].amount = Number(inputAssets[index].amount) + Number(asset.amount)
          }
        })
        if (!found) {
          inputAssets.push(asset)
        }
      })
    })
    // calculate total ERG change Amount
    const totalBetValue = betValue * BigInt(rouletteGame.bets.length)
    const changeBoxValue = BigInt(totalErg) - houseResultValue - feeBoxValue - totalBetValue;
    let changeBox = new ErgoBoxCandidateBuilder(
      BoxValue.from_i64(I64.from_str(changeBoxValue.toString())),
      Contract.pay_to_address(Address.from_base58(recipient)),
      creationHeight);

    // calculate final token balances for the changeBox
    let senderOWLRemainder: number = 0
    inputAssets.forEach((asset: any) => {
      if (asset.tokenId === TOKENID_FAKE_OWL) {
        senderOWLRemainder = Number(asset.amount) - Number(rouletteGame.totalWager)
        if (senderOWLRemainder !== 0) {
          changeBox.add_token(TokenId.from_str(TOKENID_FAKE_OWL),
            TokenAmount.from_i64(I64.from_str(senderOWLRemainder.toString())
            ));
        }
      } else {
        changeBox.add_token(TokenId.from_str(asset.tokenId),
          TokenAmount.from_i64(I64.from_str(asset.amount.toString())
          ));
      }
    })

    outputCandidates.add(changeBox.build());

    // prepare the miner fee box
    const feeBox = ErgoBoxCandidate.new_miner_fee_box(BoxValue.from_i64(I64.from_str(feeBoxValue.toString())), creationHeight);
    outputCandidates.add(feeBox);

    const unsignedTransaction = await createUnsignedTransaction(inputUtxos, outputCandidates);

    let jsonUnsignedTx = JSON.parse(unsignedTransaction.to_json());

    let txId: string | RegExpMatchArray | null = ""
    let txReducedB64safe: string | RegExpMatchArray | null = ""
    try {
      [txId, txReducedB64safe] = await getTxReducedB64Safe(jsonUnsignedTx, inputUtxos);
    } catch (e) {
      logger.error({
        message: 'exception caught from getTxReducedB64Safe',
        session_id: uuid,
        sender_addr: `${req.body.senderAddr}`,
        error: getErrorMessage(e),
        game: game,
        code: 500,
        url: betTxUrl,
      });
      res.status(500).json("exception caught from getTxReducedB64Safe")
      return
    }

    jsonUnsignedTx.inputs = inputUtxos

    // set extension: {}
    for (const i in jsonUnsignedTx.inputs) {
      jsonUnsignedTx.inputs[i].extension = {}
    }

    // convert output values and token amounts to strings
    for (const i in jsonUnsignedTx.outputs) {
      jsonUnsignedTx.outputs[i].value = jsonUnsignedTx.outputs[i].value.toString()
      for (const j in jsonUnsignedTx.outputs[i].assets) {
        jsonUnsignedTx.outputs[i].assets[j].amount = jsonUnsignedTx.outputs[i].assets[j].amount.toString()
      }
    }

    profiler.done({
      message: 'unsigned roulette bet tx built successfully',
      session_id: uuid,
      tx_id: `${txId}`,
      game: game,
      code: 200,
      url: betTxUrl,
    })
    res.status(200).json({ sessionId: uuid, unsignedTx: jsonUnsignedTx })

  }

  static async CalcWinner(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();

    let board = {} as RouletteGame
    let randNum: number = -1
    let winAmount: number = 0

    try {
      board = req.body.board as RouletteGame
      randNum = Number(req.body.randomNumber)
    } catch (e) {
      logger.error({
        message: 'failed to parse RouletteGame',
        session_id: `${req.body.sessionId}`,
        error: getErrorMessage(e),
        game: game,
        code: 500,
        url: calcWinnerUrl,
      })
      res.status(500).json("failed to parse RouletteGame")
      return
    }

    logger.info({
      message: 'calculate roulette winner called with valid board',
      session_id: `${req.body.sessionId}`,
      random_number: `${req.body.randomNumber}`,
      sender_bets: `${JSON.stringify(board.bets)}`,
      game: game,
      url: calcWinnerUrl,
    })

    const [wins, winner] = RouletteController.checkWinner(randNum, board.bets)
    if (winner) {
      winAmount = RouletteController.calcTotalWinnings(wins)
    }

    profiler.done({
      message: 'calculate roulette winner call successful',
      session_id: `${req.body.sessionId}`,
      winning_bets: wins,
      win_amount: winAmount,
      game: game,
      code: 200,
      url: calcWinnerUrl,
    })
    res.status(200).json({ winner: winner, amount: winAmount })
  }

  // this will check all bets that won and remove losing bets from the array
  static checkWinner(num: number, bets: Bet[]): [Bet[], Boolean] {
    let wins: Bet[]

    wins = bets.filter((bet: any) => {
      switch (bet.r4) {
        case Subgame.RED_BLACK: {
          if (num == 0) {
            return false
          }
          // 0 == red
          // 1 == black
          if (bet.r5 == 0) {
            if (num == 1 || num == 3 || num == 5 || num == 7 || num == 9 ||
              num == 12 || num == 14 || num == 16 || num == 18 ||
              num == 19 || num == 21 || num == 23 || num == 25 || num == 27 ||
              num == 30 || num == 32 || num == 34 || num == 36) {
              return true
            } else {
              return false
            }
          } else if (bet.r5 == 1) {
            if (num == 2 || num == 4 || num == 6 || num == 8 ||
              num == 10 || num == 11 || num == 13 || num == 15 || num == 17 ||
              num == 20 || num == 22 || num == 24 || num == 26 ||
              num == 28 || num == 29 || num == 31 || num == 33 || num == 35) {
              return true
            } else {
              return false
            }
          }
          break;
        }
        case Subgame.ODD_EVEN:
          if (num == 0) {
            return false
          }
          // 0 == even
          // 1 == odd
          if (bet.r5 % 2 == num % 2) {
            return true
          } else {
            return false
          }
          break;
        case Subgame.LOW_UPPER_HALF:
          if (num == 0) {
            return false
          }
          // 10 (1-18)
          // 28 (19-36)
          if (bet.r5 == 10) {
            if (num >= 1 && num <= 18) {
              return true
            } else {
              return false
            }
          } else if (bet.r5 == 28) {
            if (num >= 19 && num <= 36) {
              return true
            } else {
              return false
            }
          }
        case Subgame.COLUMNS:
          if (num == 0) {
            return false
          }
          // 1 (1st column)
          // 2 (2nd column)
          // 3 (3rd column)
          if (bet.r5 == 1) {
            if (num == 3 || num == 6 || num == 9 || num == 12 ||
              num == 15 || num == 18 || num == 21 || num == 24 ||
              num == 27 || num == 30 || num == 33 || num == 36) {
              return true
            } else {
              return false
            }
          } else if (bet.r5 == 2) {
            if (num == 2 || num == 5 || num == 8 || num == 11 ||
              num == 14 || num == 17 || num == 20 || num == 23 ||
              num == 26 || num == 29 || num == 32 || num == 35) {
              return true
            } else {
              return false
            }
          } else if (bet.r5 == 3) {
            if (num == 1 || num == 4 || num == 7 || num == 10 ||
              num == 13 || num == 16 || num == 19 || num == 22 ||
              num == 25 || num == 28 || num == 31 || num == 34) {
              return true
            } else {
              return false
            }
          }
        case Subgame.LOWER_MID_UPPER_3RD:
          if (num == 0) {
            return false
          }
          // 6 (1-12)
          // 18 (13-24)
          // 30 (25-36)
          if (bet.r5 == 6) {
            if (num >= 1 && num <= 12) {
              return true
            } else {
              return false
            }
          } else if (bet.r5 == 18) {
            if (num >= 13 && num <= 24) {
              return true
            } else {
              return false
            }
          } else if (bet.r5 == 30) {
            if (num >= 25 && num <= 36) {
              return true
            } else {
              return false
            }
          }
        case Subgame.EXACT:
          if (bet.r5 == num) {
            return true
          } else {
            return false
          }
      }
    })

    return [wins, wins.length > 0]
  }

  static calcTotalWinnings(bets: Bet[]): number {
    let winnings: number = 0
    bets.forEach((bet: any) => {
      winnings += (bet.amount * bet.multiplier + bet.amount)
    })
    return winnings
  }
}