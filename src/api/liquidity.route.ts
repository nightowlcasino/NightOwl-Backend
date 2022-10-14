import express from "express"
import LiquidityController from "./liquidity.controller";

const router = express.Router();

router.route("/max-payout").get(LiquidityController.MaxPayout)
router.route("/max-payout/test").get(LiquidityController.TestCall)

export default router
