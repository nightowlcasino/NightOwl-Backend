import express from "express"
import LiquidityController from "./liquidity.controller";

const router = express.Router();

router.route("/max-payout").get(LiquidityController.MaxPayout)

export default router
