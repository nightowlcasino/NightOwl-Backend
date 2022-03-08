import express from "express"
import SwapController from "./swap.controller";

const router = express.Router();

router.route("/sigusd/:addr/:amnt").get(SwapController.SwapSigUSD)
router.route("/owl/:addr/:amnt").get(SwapController.SwapOWL)

export default router
