import express from "express"
import ErgoPayController from "./ergopay.controller";

const router = express.Router();

router.route("/coinflip/:addr/:bet").get(ErgoPayController.Coinflip)
router.route("/reply/:txId").get(ErgoPayController.Reply)
router.route("/sigusd/:addr/:amnt").get(ErgoPayController.SwapSigUSD)
router.route("/owl/:addr/:amnt").get(ErgoPayController.SwapOWL)

export default router
