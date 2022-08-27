import { Request, Response } from "express"
import logger from "../logger"

const lpAmountUrl = '/api/v1/liquidity/max-bet'

export default class LiquidityController {
  // return the total liquidity pool amount * 1.5% which should be the max allowable winnable payout
  static async MaxBet(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();

    logger.info('', {
      url: lpAmountUrl,
      hostname: `${logger.defaultMeta.hostname}`
    })


    profiler.done({
      url: lpAmountUrl,
      hostname: `${logger.defaultMeta.hostname}`,
      liquidity_amount: 10000000,
      max_payout: 150000,
      code: 200
    })
    res.status(200).json({ amount: 150000 })

  }
}