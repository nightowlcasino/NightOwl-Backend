import express, { Application, Request, Response, NextFunction } from "express"
import cors from "cors"
import leaderboard from "./api/leaderboard.route"

const app: Application = express()

app.use(cors())
app.use(express.json())

app.use("/api/v1/leaderboard", leaderboard)
app.use("*", (req: Request, res: Response) => res.status(404).json({ error: "not found"}))

export default app