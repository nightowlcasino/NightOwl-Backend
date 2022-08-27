import express from "express"
import LiquidityController from "./liquidity.controller";

const router = express.Router();

router.route("/max-bet").get(LiquidityController.MaxBet)

export default router
