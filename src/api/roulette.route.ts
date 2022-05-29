import express from "express"
import RouletteController from "./roulette.controller";

const router = express.Router();

router.route("/bet-tx").post(RouletteController.BetTx)

export default router
