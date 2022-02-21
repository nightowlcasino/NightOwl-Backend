import express from "express"
import ErgoPayController from "./ergopay.controller";

const router = express.Router();

router.route("/coinflip/:addr/:bet").get(ErgoPayController.ErgoPayCoinflip)
router.route("/reply/:txId").get(ErgoPayController.ErgoPayReply)

export default router
