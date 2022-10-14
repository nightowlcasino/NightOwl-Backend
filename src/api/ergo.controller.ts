import { Request, Response } from "express"
import { encodeNum, encodeHex } from "../ergo/serializer"
import { getErrorMessage } from '../utils/error'
import logger from "../logger"

const encodeNumUrl = "/api/v1/ergo/encode-num"
const encodeHexUrl = "/api/v1/ergo/encode-hex"

export default class ErgoNodeController {
  static async EncodeNum(req: Request, res: Response): Promise<void> {
    let encoded: string = ""
    let body: any
    let isInt: boolean = false

    // validate request input
    try {
      body = JSON.parse(JSON.stringify(req.body))
      if (body.isInt) {
        isInt = JSON.parse(body.isInt);
      }
    } catch (e) {
      logger.debug({
        code: 400,
        message: 'encode number invalid request',
        error: `${getErrorMessage(e)}`,
        body: `${JSON.stringify(req.body)}`,
        url: encodeNumUrl,
      });

      res.status(400).json({ result: -1, error: `${getErrorMessage(e)}` })
      return
    }

    try {
      encoded = await encodeNum(req.body.number.toString(), isInt)
    } catch (e) {
      logger.debug({
        code: 500,
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
      number: `${body.number}`,
      encoded: `${encoded}`,
      url: encodeNumUrl,
    });

    res.status(200).json({ result: `${encoded}`, error: null })
    return
  }

  static async EncodeHex(req: Request, res: Response): Promise<void> {
    let encoded: string = ""
    let body: any

    // validate request input
    try {
      body = JSON.parse(JSON.stringify(req.body))
    } catch (e) {
      logger.debug({
        code: 400,
        message: 'encode hex invalid request',
        error: `${getErrorMessage(e)}`,
        body: `${JSON.stringify(req.body)}`,
        url: encodeNumUrl,
      });

      res.status(400).json({ result: -1, error: `${getErrorMessage(e)}` })
      return
    }

    try {
      encoded = await encodeHex(body.reg.toString())
    } catch (e) {
      logger.error({
        code: 500,
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
      reg: `${body.reg}`,
      encoded: `${encoded}`,
      url: encodeHexUrl,
    });

    res.status(200).json({ result: `${encoded}`, error: null })
    return
  }
}