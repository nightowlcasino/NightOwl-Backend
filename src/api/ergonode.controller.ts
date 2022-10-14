import { Request, Response } from "express"
import { postTx } from "../utils/rest"
import { NIGHTOWL_EXPLORER_API_ADDRESS, NIGHTOWL_NODE_ADDRESS } from "../constants/ergo"
import logger from "../logger"
import { v4 as uuidv4 } from 'uuid'
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config()
const nodeUser = process.env.NODE_USER || ""
const nodePass = process.env.NODE_PASS || ""
const apikey = process.env.NODE_APIKEY || ""

const postTxUrl = "/api/v1/transactions"

function checkResponseStatus(res: any) {
  if (res.ok) {
    return res
  } else {
    throw new Error(`The HTTP status of the reponse: ${res.status} (${res.statusText})`);
  }
}

export default class ErgoNodeController {
  static async SendTx(req: Request, res: Response): Promise<void> {
    const profiler = logger.startTimer();
    const uuid = uuidv4()
    let txResp: string = ""

    logger.info({
      message: 'sending signed tx to ergo node',
      session_id: `${req.body.sessionId}`,
      tx_id: `${req.body.tx.id}`,
      sender_addr: `${req.body.senderAddr}`,
      game: `${req.body.game}`,
      url: postTxUrl,
    });

    //const resp = await postTx(NIGHTOWL_EXPLORER_API_ADDRESS+"transactions", req.body.tx)
    fetch(NIGHTOWL_EXPLORER_API_ADDRESS + "transactions", {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'mode': 'cors',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Authorization': nodeUser !== "" && nodePass !== "" ? 'Basic ' + btoa(nodeUser + ':' + nodePass) : '',
        'api_key': apikey !== "" ? apikey : '',
      },
      body: JSON.stringify(req.body.tx)
    }).then(checkResponseStatus)
      .then(res => res.json())
      .then(json => {
        txResp = json
        profiler.done({
          message: 'POST request to ergo node was successful',
          session_id: `${req.body.sessionId}`,
          tx_id: `${txResp}`,
          code: 200,
          url: postTxUrl,
        })
        res.status(200).json(`${txResp}`)
        return
      })
      .catch(err => {
        profiler.done({
          message: 'POST request to ergo node failed',
          session_id: `${req.body.sessionId}`,
          tx_id: `${req.body.tx.id}`,
          error: `${err}`,
          level: "error",
          code: 500,
          url: postTxUrl,
        })
        res.status(500).json("node failed to send tx")
        return
      })
  }
}