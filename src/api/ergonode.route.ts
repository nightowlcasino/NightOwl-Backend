import express from "express"
import ErgoNodeController from "./ergonode.controller";

const router = express.Router();

router.route("/").post(ErgoNodeController.SendTx)

export default router
