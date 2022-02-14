import express from "express"
import ErgoPayController from "./ergopay.controller";

const router = express.Router();

router.route("/roundTrip").get(ErgoPayController.ErgoPayRoundTrip)
router.route("/roundTrip/:addr").get(ErgoPayController.ErgoPayRoundTrip)
router.route("/reply/:txId").get(ErgoPayController.ErgoPayReply)

export default router
