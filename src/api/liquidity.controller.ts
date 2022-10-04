import { Request, Response } from "express"
import logger from "../logger"

const lpAmountUrl = '/api/v1/liquidity/max-payout'

export default class LiquidityController {
  // return the total liquidity pool amount * 1.5% which should be the max allowable winnable payout
  static async MaxPayout(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();

    logger.debug({
      message: 'liquidity max-payout called',
      labels: {
        hostname: logger.defaultMeta.hostname,
        app: logger.defaultMeta.app,
        env: logger.defaultMeta.env,
        url: lpAmountUrl,
      }
    })


    profiler.done({
      message: 'max-payout amount successully calculated',
      level: 'debug',
      liquidity_amount: 10000000,
      max_payout: 150000,
      labels: {
        hostname: logger.defaultMeta.hostname,
        app: logger.defaultMeta.app,
        env: logger.defaultMeta.env,
        url: lpAmountUrl,
        code: 200
      }
    })
    res.status(200).json({ amount: 150000 })

  }
}