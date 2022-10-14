import { Request, Response } from "express"
import { encodeNum, encodeHex } from "../ergo/serializer"
import { getErrorMessage } from '../utils/error'
import logger from "../logger"

const encodeNumUrl = "/api/v1/ergo/encode-num"
const encodeHexUrl = "/api/v1/ergo/encode-hex"

export default class ErgoNodeController {
  static async EncodeNum(req: Request, res: Response): Promise<void> {
    let encoded: string = ""
    let isInt: boolean = false

    try {
      if (req.body.isInt) {
        isInt = JSON.parse(req.body.isInt.toLowerCase());
      }
    } catch (e) { }

    try {
      encoded = await encodeNum(req.body.number.toString(), isInt)
    } catch (e) {
      logger.debug({
        message: 'encode number failed',
        error: `${getErrorMessage(e)}`,
        body: `${JSON.stringify(req.body)}`,
        url: encodeNumUrl,
      });

      res.status(500).json({ result: -1, error: `${getErrorMessage(e)}` })
      return
    }

    logger.debug({
      message: 'encoded number',
      number: `${req.body.number}`,
      encoded: `${encoded}`,
      url: encodeNumUrl,
    });

    res.status(200).json({ result: `${encoded}`, error: null })
    return
  }

  static async EncodeHex(req: Request, res: Response): Promise<void> {
    let encoded: string = ""

    try {
      encoded = await encodeHex(req.body.reg.toString())
    } catch (e) {
      logger.debug({
        message: 'encode hex failed',
        error: `${getErrorMessage(e)}`,
        body: `${JSON.stringify(req.body)}`,
        url: encodeHexUrl,
      });

      res.status(500).json({ result: -1, error: `${getErrorMessage(e)}` })
      return
    }

    logger.debug({
      message: 'encoded hex',
      reg: `${req.body.reg}`,
      encoded: `${encoded}`,
      url: encodeHexUrl,
    });

    res.status(200).json({ result: `${encoded}`, error: null })
    return
  }
}