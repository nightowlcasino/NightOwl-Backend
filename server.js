import express from "express"
import cors from "cors"
import leaderboard from "./api/leaderboard.route.js"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/v1/leaderboard", leaderboard)
app.use("*", (req, res) => res.status(404).json({ error: "not found"}))

export default app