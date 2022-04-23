import express, { Application, Request, Response, NextFunction } from "express"
import cors from "cors"
import bodyparser from "body-parser"
import leaderboard from "./api/leaderboard.route"
import ergopay from "./api/ergopay.route"
import swap from "./api/swap.route"
import roulette from "./api/roulette.route"

const app: Application = express()

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));
app.use(cors())
//app.use(express.json())
app.use(function(req: Request, res: Response, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use("/api/v1/leaderboard", leaderboard)
app.use("/api/v1/ergopay", ergopay)
app.use("/api/v1/swap", swap)
app.use("/api/v1/roulette", roulette)
app.use("*", (req: Request, res: Response) => res.status(404).json({ error: "not found"}))

export default app