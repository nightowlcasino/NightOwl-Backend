import { Request, Response } from "express"
import redisClient from "../redis/redis"
import logger from "../logger"
import { v4 as uuidv4 } from 'uuid'

const lpAmountUrl = '/api/v1/liquidity/max-payout'
const lpAmountTestUrl = "/api/v1/liquidity/max-payout/test"

export default class LiquidityController {
  // return the total liquidity pool amount * 1.5% which should be the max allowable winnable payout
  static async MaxPayout(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();
    const uuid = uuidv4()

    const result = await redisClient.get("liquidity:total");
    if (result === null) {
      profiler.done({
        error: "max-payout data is missing",
        message: "MaxPayout call failed",
        level: "error",
        request_id: `${uuid}`,
        url: lpAmountUrl,
        code: 500,
      })
      res.status(500).json("max-payout data is missing")
      return
    }

    const owlTokenAmount = Number(result)
    const maxPayout = owlTokenAmount * .015

    profiler.done({
      message: "max-payout amount successully calculated",
      level: 'debug',
      request_id: `${uuid}`,
      liquidity_amount: owlTokenAmount,
      max_payout: maxPayout,
      url: lpAmountUrl,
      code: 200,
    })
    res.status(200).json({ amount: `${maxPayout}` })

  }

  static async TestCall(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();

    profiler.done({
      message: 'max-payout amount successully calculated',
      level: 'debug',
      liquidity_amount: 100000000,
      max_payout: 1500000,
      url: lpAmountTestUrl,
      code: 200,
    })
    res.status(200).json({ amount: 1500000 })

  }
}