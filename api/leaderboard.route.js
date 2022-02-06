import express from "express"
import LeaderboardCtrl from "./leaderboard.controller.js";

const router = express.Router();

router.route("/").get(LeaderboardCtrl.apiGetLeaderboard)

export default router
