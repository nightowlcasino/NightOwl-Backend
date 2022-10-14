import express, { Application, Request, Response } from "express"
import { spawn, Thread, Worker } from "threads"
import { LBWorker } from "./workers/leaderboard"
import { MPWorker } from "./workers/max-payout"
import cors from "cors"
import bodyparser from "body-parser"
import leaderboard from "./api/leaderboard.route"
import liquidity from "./api/liquidity.route"
import ergopay from "./api/ergopay.route"
import ergonode from "./api/ergonode.route"
import swap from "./api/swap.route"
import roulette from "./api/roulette.route"
import ergo from "./api/ergo.route"
import path from "path"
import logger from "./logger"

const app: Application = express();

// spawn leaderboard worker thread
(async () => {
  const lbWorker = await spawn<LBWorker>(new Worker("./workers/leaderboard"))
  try {
    lbWorker.values().subscribe((log: any) => {
      logger.info(`${log}`)
    })
    await lbWorker.startLeaderboard()
  } catch (error) {
    logger.error("leaderboard worker thread errored:", error)
  } finally {
    lbWorker.finish()
    await Thread.terminate(lbWorker)
  }
})();

// spawn max-payout worker thread
//(async () => {
//  const mpWorker = await spawn<MPWorker>(new Worker("./workers/max-payout"))
//  try {
//    mpWorker.values().subscribe((log: any) => {
//      logger.info(`${log}`)
//    })
//    await mpWorker.startMaxPayout()
//  } catch (error) {
//    logger.error("max-payout worker thread errored:", error)
//  } finally {
//    mpWorker.finish()
//    await Thread.terminate(mpWorker)
//  }
//})();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
  extended: true
}));
app.use(cors())
app.use(function (req: Request, res: Response, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.static(path.join(__dirname, '../client/build')))

app.use("/api/v1/leaderboard", leaderboard)
app.use("/api/v1/liquidity", liquidity)
app.use("/api/v1/ergopay", ergopay)
app.use("/api/v1/swap", swap)
app.use("/api/v1/roulette", roulette)
app.use("/api/v1/transactions", ergonode)
app.use("/api/v1/ergo", ergo)
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'))
})

export default app;