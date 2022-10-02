import { Observable, Subject } from "threads/observable"
import { expose } from "threads/worker"
import logger from "../logger";
import redisClient from "../redis/redis"
import { get } from '../utils/rest'
import { currentHeight } from '../ergo/explorer'
import { getErrorMessage } from '../utils/error'
import { Leaderboard, WinningBet } from "../models/leaderboard"
import { TEST_ROULETTE_RESULT_CONTRACT_ADDRESS, TOKENID_FAKE_OWL, TEST_HOUSE_CONTRACT_ADDRESS } from '../constants/ergo'

const explorerApi = "https://api.ergoplatform.com/api/v1"
//const explorerApi = "https://ergo-explorer-cdn.getblok.io/api/v1"
const limit = 50
const redisLeaderBrdAllKey = "leaderboard:all"
const redisLeaderBrdLastHeightKey = "leaderboard:lastBetHeight"

const sleep = async (durationMs: number) => {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

let subject = new Subject()

const leaderboardWorker = {
  async startLeaderboard() {

    for (; ;) {
      subject.next("leaderboard task started")

      let lastHeight = await getLastHeight()
      let currHeight = await currentHeight()
      const newBets = Array<WinningBet>()

      await scanResultsAddress(TEST_ROULETTE_RESULT_CONTRACT_ADDRESS, lastHeight, currHeight)
        .then((resp) => {
          const txs = JSON.parse(JSON.stringify(resp))

          txs.forEach((tx: any) => {
            if (tx.hasOwnProperty("outputs") && tx["outputs"].length === 2) {
              const outputZero = tx["outputs"][0]
              if (outputZero.hasOwnProperty("assets") && outputZero["assets"].length === 1) {
                if (outputZero["assets"][0]["tokenId"] === TOKENID_FAKE_OWL && outputZero["address"] !== TEST_HOUSE_CONTRACT_ADDRESS) {
                  // add won bet to array for further processing
                  const bet = new WinningBet(
                    outputZero["address"],
                    Number(outputZero["assets"][0]["amount"]),
                    tx["id"]
                  )
                  newBets.push(bet)
                }
              }
            }
          })
        })
        .catch(err => {
          subject.error(getErrorMessage(err))
        })

      // compare won bet amounts to what we have in the redis DB
      await compareBetAmounts(newBets)
        .then(() => { })
        .catch(err => {
          subject.error(getErrorMessage(err))
        })

      // save off current height as last height
      const res = await redisClient.set(redisLeaderBrdLastHeightKey, currHeight)
      if (res !== "OK") {
        subject.error(`failed to write ${redisLeaderBrdLastHeightKey} to redis db`)
      }

      subject.next("leaderboard task finished")

      // sleep for 15min
      await sleep(900000)
    }

  },
  finish() {
    subject.complete()
    subject = new Subject()
  },
  values() {
    return Observable.from(subject)
  }
};

async function scanResultsAddress(resultContractAddress: string, minHeight: number, maxHeight: number): Promise<any[]> {
  let offset = 0
  let txs: any[] = []
  let url = ""

  // continuously call explorer api until we have gotten all txs between min and max heights
  for (; ;) {
    url = `/addresses/${resultContractAddress}/transactions?fromHeight=${minHeight.toString()}&toHeight=${maxHeight.toString()}&limit=${limit.toString()}&offset=${offset.toString()}`
    const batch = await get(explorerApi + url)
      .then(resp => {
        if (resp.hasOwnProperty("items") && resp["items"].length > 0) {
          return resp["items"]
        }
        return []
      })
      .catch(err => {
        throw err
      });
    if (batch.length !== 0) {
      txs = txs.concat(batch)
    } else {
      return txs
    }

    offset += limit
  }
}

async function getLastHeight() {
  let height = 0
  let res = await redisClient.get(redisLeaderBrdLastHeightKey);
  if (res === null) {
    // default to 0 if missing
    res = await redisClient.set(redisLeaderBrdLastHeightKey, 0)
    if (res !== "OK") {
      subject.error(`failed to write ${redisLeaderBrdLastHeightKey} to redis db`)
    }
  } else {
    height = Number(res)
  }

  return height
}

async function compareBetAmounts(newBets: Array<WinningBet>): Promise<void> {
  let lb = new Leaderboard()

  // get current top wins from redis DB
  let ldrBrd = await redisClient.get(redisLeaderBrdAllKey);
  if (ldrBrd !== null) {
    // populate leaderboard array (should only be 10 items)
    const ldrBrdObj = JSON.parse(ldrBrd || '{}')
    if (ldrBrdObj.hasOwnProperty("bets")) {
      ldrBrdObj["bets"].forEach((b: any) => {
        const bet: WinningBet = WinningBet.fromJson(b)
        lb.addBet(bet)
      })
    }
  }

  // Add bets we just scanned to the array, ignoring duplicate transaction Ids
  newBets.forEach((b) => {
    let found = false

    lb.bets?.every((tb) => {
      if (b.txId === tb.txId) {
        found = true
        return false
      }
      return true
    })

    if (!found) {
      lb.addBet(b)
    }
    found = false
  })

  // reverse sort bets by amount, this should bring the top 10 largest wins first
  lb.reverseSort()

  // only save first 10 elements in array to redis DB
  if (lb.bets && lb.bets.length >= 10) {
    lb = new Leaderboard(lb.bets.slice(0, 10))
  }

  const result = await redisClient.set(redisLeaderBrdAllKey, JSON.stringify(lb))
  if (result !== "OK") {
    throw new Error(`failed to write ${redisLeaderBrdAllKey} to redis db`)
  }

  return
}

export type LBWorker = typeof leaderboardWorker

expose(leaderboardWorker)