import { Observable, Subject } from "threads/observable"
import { expose } from "threads/worker"
import redisClient from "../redis/redis"
import { get } from '../utils/rest'
import { currentHeight } from '../ergo/explorer'
import { getErrorMessage } from '../utils/error'
import { Liquidity } from "../models/liquidity"
import { TOKENID_FAKE_LP, TEST_HOUSE_CONTRACT_ADDRESS } from '../constants/ergo'

const explorerApi = "https://api.ergoplatform.com/api/v1"
//const explorerApi = "https://ergo-explorer-cdn.getblok.io/api/v1"
const limit = 50
const redisLiquidityTotalKey = "liquidity:total"
const redisLiquidityPendingKey = "liquidity:pending"
const redisLiquidityLastHeightKey = "liquidity:lastHeight"

const sleep = async (durationMs: number) => {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

let subject = new Subject()

const maxPayoutWorker = {
  async startMaxPayout() {

    for (; ;) {
      subject.next("max-payout task started")

      let lastHeight = await getLastHeight()
      let currHeight = await currentHeight()
      const liquidity = new Liquidity(0)

      let url = `/addresses/${TEST_HOUSE_CONTRACT_ADDRESS}/balance/confirmed?minConfirmations=3`
      const batch = await get(explorerApi + url)
        .then(resp => {
          console.log(resp)
        })
        .catch(err => {
          subject.error(getErrorMessage(err))
        })

      // save off current height as last height
      //const res = await redisClient.set(redisLeaderBrdLastHeightKey, currHeight)
      //if (res !== "OK") {
      //  subject.error(`failed to write ${redisLeaderBrdLastHeightKey} to redis db`)
      //}

      subject.next("leaderboard task finished")

      // sleep for 2min
      await sleep(120000)
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

async function getLastHeight() {
  let height = 0
  let res = await redisClient.get(redisLiquidityLastHeightKey);
  if (res === null) {
    // default to 0 if missing
    res = await redisClient.set(redisLiquidityLastHeightKey, 0)
    if (res !== "OK") {
      subject.error(`failed to write ${redisLiquidityLastHeightKey} to redis db`)
    }
  } else {
    height = Number(res)
  }

  return height
}

export type MPWorker = typeof maxPayoutWorker

expose(maxPayoutWorker)

