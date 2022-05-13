import express, { Application, Request, Response, NextFunction } from "express"
import cors from "cors"
import bodyparser from "body-parser"
import leaderboard from "./api/leaderboard.route"
import ergopay from "./api/ergopay.route"
import swap from "./api/swap.route"
import roulette from "./api/roulette.route"
import path from "path"

const app: Application = express()

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));
app.use(cors())
app.use(function(req: Request, res: Response, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.static(path.join(__dirname, '../client/build'))) 

app.use("/api/v1/leaderboard", leaderboard)
app.use("/api/v1/ergopay", ergopay)
app.use("/api/v1/swap", swap)
app.use("/api/v1/roulette", roulette)
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'))
})

export default app