import LeaderboardDAO from "../dao/leaderboardDAO"
import { Request, Response } from "express"
import redisClient from "../redis/redis"
import { Leaderboard } from "../models/leaderboard"
import logger from "../logger"
import { v4 as uuidv4 } from 'uuid'

const leaderboardAllUrl = "/api/v1/leaderboard/all"

const testData = [
  {
    address: "9gQYrh6yubA4z55u4TtsacKnaEteBEdnY4W2r5BLcFZXcQoQDcq",
    amount: "1200000",
    txId: "0cf64e539432288652ff49f459abd893750b7afb53fbc3decfe654f7f2fcb464"
  },
  {
    address: "9fPiW45mZwoTxSwTLLXaZcdekqi72emebENmScyTGsjryzrntUe",
    amount: "900000",
    txId: "e5c2020a04af5aae92262fcbae02b5c3baed6a91558c785237d39d7d0405a23f"
  },
  {
    address: "9fgc4cBEMfz8RDfwxduRA895Sxm5p9LKdE3DqfEQp2LVU1XwyT2",
    amount: "876543",
    txId: "55e5f2e89ca43da55ba8c29e1061dde018df2455efe3e3a1d92cb7b910061ffc"
  },
  {
    address: "9iKFBBrryPhBYVGDKHuZQW7SuLfuTdUJtTPzecbQ5pQQzD4VykC",
    amount: "750000",
    txId: "3ab736e2fe418f87251b0582f28c49acf03850c86e5d3d056215cd5566b40d09"
  },
  {
    address: "9fj1RQT9vF8aztVx88sbCttKvJxcX7sSyGFkwUfy9dp9aXvrrTa",
    amount: "549832",
    txId: "bc6b69d991edc43b7f382d2cebcbc87401ce6d5e67fd9be55a780df6a2de1a59"
  },
  {
    address: "9gXPZWxQZQpKsBCW2QCiBjJbhtghxEFtA9Ba6WygnKmrD4g2e8B",
    amount: "430292",
    txId: "675c8784b075fcfe3f1edbf5226f00418cf97d5b78739d0f963c38ad7960993e"
  },
  {
    address: "9hSVhF75dk111BR1SLdSmF1Ub9M3aSEvwDFpxMVdNjVMNKePcGr",
    amount: "113000",
    txId: "07dc9ebeac98e50649dcc7b33e4c4a4ce6992e5339aea0c205c26cbffa892e34"
  },
  {
    address: "9i7Bd7H6jViJJCu8VvWiCJ9ZqXqWw7BMx4dSRhfRkGSQ6sPx3JD",
    amount: "75000",
    txId: "534af7d9997a36634363033e50e5061c9eaa45e2180d154199fe5516d77338e1"
  },
  {
    address: "9fWHG2F9NWCwYa6z9Vuzy6ktUjGjZcEHqnqThKfDqJeAGqhDP7x",
    amount: "50000",
    txId: "64929c1bdbdf013d3ca9adb49988d3d589266949b794d87464a946fbc14f1822"
  },
  {
    address: "9iQ2xKmNj2K9uvjNTbWZXKqiSMQLSbXXYX9Jy1wbjVuTxXnoxoi",
    amount: "43210",
    txId: "bd067072452e8883e5b60e1b9b331997b97b2646e89954cb3bb44b89b7f39e70"
  }
]

export default class LeaderboardController {
  static async GetAllGames(req: Request, res: Response): Promise<void> {

    const profiler = logger.startTimer();
    const uuid = uuidv4()
    const leaderboardLogger = logger.child({ request_id: `${uuid}` });

    const result = await redisClient.get("leaderboard:all");
    if (result === null) {
      // fill in test data for now
      const lb = new Array<Leaderboard>()
      testData.forEach((val) => {
        const topspot: Leaderboard = new Leaderboard(
          val.address,
          val.amount,
          val.txId,
        )
        lb.push(topspot)
      })

      const result = await redisClient.set("leaderboard:all", JSON.stringify(lb))
      if (result !== "OK") {
        leaderboardLogger.info('failed to write leaderboard:all to redis db')
      }

      profiler.done({
        hostname: `${leaderboardLogger.defaultMeta.hostname}`,
        request_id: `${uuid}`,
        error: "leaderboard data for all games is missing",
        code: 500
      })
      res.status(500).json("leaderboard data for all games is missing")
      return
    }

    profiler.done({
      hostname: `${leaderboardLogger.defaultMeta.hostname}`,
      request_id: `${uuid}`,
      url: leaderboardAllUrl,
      code: 200
    })
    res.status(200).json(JSON.parse(result))
  }
}