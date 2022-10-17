import express from "express"
import ErgoController from "./ergo.controller";

const router = express.Router();

router.route("/encode-num").post(ErgoController.EncodeNum)
router.route("/encode-hex").post(ErgoController.EncodeHex)
router.route("/ergo-tree-base16").post(ErgoController.ErgoTreeBase16)

export default router
