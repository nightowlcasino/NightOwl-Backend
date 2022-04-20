import express from "express"
import RouletteController from "./roulette.controller";

const router = express.Router();

router.route("/spin").post(RouletteController.Spin)

export default router
