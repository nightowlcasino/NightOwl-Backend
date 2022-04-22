import express from "express"
import SwapController from "./swap.controller";

const router = express.Router();

router.route("/sigusd").post(SwapController.SwapSigUSD)
router.route("/owl").post(SwapController.SwapOWL)

export default router
