import express from "express"
import LeaderboardController from "./leaderboard.controller";

const router = express.Router();

router.route("/").get(LeaderboardController.apiGetLeaderboard)

export default router
