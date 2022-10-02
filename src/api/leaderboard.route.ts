import express from "express"
import LeaderboardController from "./leaderboard.controller";

const router = express.Router();

router.route("/all").get(LeaderboardController.GetAllGames)
router.route("/test").get(LeaderboardController.TestCall)

export default router
