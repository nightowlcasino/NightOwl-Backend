import express from "express"
import RouletteController from "./roulette.controller";

const router = express.Router();

router.route("/bet-tx").post(RouletteController.BetTx)
router.route("/calculate-winner").post(RouletteController.CalcWinner)

export default router
