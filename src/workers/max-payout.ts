import { Observable, Subject } from "threads/observable"
import { expose } from "threads/worker"
import redisClient from "../redis/redis"
import { get } from '../utils/rest'
import { getErrorMessage } from '../utils/error'
import { Liquidity } from "../models/liquidity"
import { TEST_HOUSE_CONTRACT_ADDRESS } from '../constants/ergo'

const explorerApi = "https://api.ergoplatform.com/api/v1"
//const explorerApi = "https://ergo-explorer-cdn.getblok.io/api/v1"
const redisLiquidityTotalKey = "liquidity:total"
const redisLiquidityPendingKey = "liquidity:pending"

const sleep = async (durationMs: number) => {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

let subject = new Subject()

const maxPayoutWorker = {
  async startMaxPayout() {

    for (; ;) {
      subject.next("max-payout task started")

      const liquidity = new Liquidity(0)

      let url = `/addresses/${TEST_HOUSE_CONTRACT_ADDRESS}/balance/confirmed?minConfirmations=3`
      const batch = await get(explorerApi + url)
        .then(async resp => {
          const tokens = JSON.parse(JSON.stringify(resp))
          const liquidityAmount: Liquidity = Liquidity.fromJson(tokens)

          subject.next({
            message: "successfully got liquidity pool tokens",
            owl_token_amount: liquidityAmount.owlAmount,
            lp_token_amount: liquidityAmount.lpAmount,
            max_payout: liquidityAmount.owlAmount * 0.15
          })

          // save off latest LP OWL balance which we capture every 30 seconds
          const res = await redisClient.set(redisLiquidityTotalKey, liquidityAmount.owlAmount || 0)
          if (res !== "OK") {
            subject.error(`failed to write ${redisLiquidityTotalKey} to redis db`)
          }
        })
        .catch(err => {
          subject.error(getErrorMessage(err))
        })

      subject.next("max-payout task finished")

      // sleep for 30 seconds
      await sleep(30000)
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

export type MPWorker = typeof maxPayoutWorker

expose(maxPayoutWorker)

