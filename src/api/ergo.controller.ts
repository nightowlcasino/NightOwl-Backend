import { Request, Response } from "express"
import { encodeNum, encodeHex } from "../ergo/serializer"
import { Address } from '../../pkg-nodejs/ergo_lib_wasm'
import { getErrorMessage } from '../utils/error'
import logger from "../logger"

const encodeNumUrl = "/api/v1/ergo/encode-num"
const encodeHexUrl = "/api/v1/ergo/encode-hex"
const ergoTreeBase16Url = "/api/v1/ergo/ergo-tree-base16"

export default class ErgoNodeController {
  static async EncodeNum(req: Request, res: Response): Promise<void> {
    let encoded: string = ""
    let body: any
    let bodyRaw: string = ""
    let isInt: boolean = false

    // validate request input
    try {
      bodyRaw = JSON.stringify(req.body)
      body = JSON.parse(bodyRaw)
      if (body.isInt) {
        isInt = JSON.parse(body.isInt);
      }
    } catch (e) {
      const err = getErrorMessage(e)
      logger.error({
        code: 400,
        message: 'encode number invalid request',
        error: `${err}`,
        body: `${bodyRaw}`,
        url: encodeNumUrl,
      });

      res.status(400).json({ result: -1, error: `${err}` })
      return
    }

    try {
      encoded = await encodeNum(req.body.number.toString(), isInt)
    } catch (e) {
      const err = getErrorMessage(e)
      logger.error({
        code: 500,
        message: 'encode number failed',
        error: `${err}`,
        body: `${bodyRaw}`,
        url: encodeNumUrl,
      });

      res.status(500).json({ result: -1, error: `${err}` })
      return
    }

    logger.debug({
      code: 200,
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
    let bodyRaw: string = ""

    // validate request input
    try {
      bodyRaw = JSON.stringify(req.body)
      body = JSON.parse(bodyRaw)
    } catch (e) {
      const err = getErrorMessage(e)
      logger.error({
        code: 400,
        message: 'encode hex invalid request',
        error: `${err}`,
        body: `${bodyRaw}`,
        url: encodeHexUrl,
      });

      res.status(400).json({ result: -1, error: `${err}` })
      return
    }

    try {
      encoded = await encodeHex(body.reg.toString())
    } catch (e) {
      const err = getErrorMessage(e)
      logger.error({
        code: 500,
        message: 'encode hex failed',
        error: `${err}`,
        body: `${bodyRaw}`,
        url: encodeHexUrl,
      });

      res.status(500).json({ result: -1, error: `${err}` })
      return
    }

    logger.debug({
      code: 200,
      message: 'encoded hex',
      reg: `${body.reg}`,
      encoded: `${encoded}`,
      url: encodeHexUrl,
    });

    res.status(200).json({ result: `${encoded}`, error: null })
    return
  }

  static async ErgoTreeBase16(req: Request, res: Response): Promise<void> {
    let base16: string = ""
    let body: any
    let bodyRaw: string = ""

    // validate request input
    try {
      bodyRaw = JSON.stringify(req.body)
      body = JSON.parse(bodyRaw)
    } catch (e) {
      const err = getErrorMessage(e)
      logger.error({
        code: 400,
        message: 'convert address to ergo tree base16 invalid request',
        error: `${err}`,
        body: `${bodyRaw}`,
        url: ergoTreeBase16Url,
      });

      res.status(400).json({ result: -1, error: `${err}` })
      return
    }

    try {
      base16 = Address.from_mainnet_str(body.addr.toString()).to_ergo_tree().to_base16_bytes()
    } catch (e) {
      const err = getErrorMessage(e)
      logger.error({
        code: 500,
        message: 'convertion from address to ergotree base16 failed',
        error: `${err}`,
        body: `${bodyRaw}`,
        url: ergoTreeBase16Url,
      });

      res.status(500).json({ result: -1, error: `${err}` })
      return
    }

    logger.debug({
      code: 200,
      message: 'converted address to ergotree base16',
      address: `${body.addr}`,
      ergoTreeBase16: `${base16}`,
      url: ergoTreeBase16Url,
    });

    res.status(200).json({ result: `${base16}`, error: null })
    return
  }
}