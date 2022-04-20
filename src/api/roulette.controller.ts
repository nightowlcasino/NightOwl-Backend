import { Request, Response } from "express"
import logger from "../logger"
import {v4 as uuidv4} from 'uuid'


export default class RouletteController {
  static async Spin(req: Request, res:Response): Promise<void> {
    const profiler = logger.startTimer();
    const uuid = uuidv4()
    const rouletteLogger = logger.child({ request_id: `${uuid}` });
    
    rouletteLogger.info('', {
        url: '/api/v1/roulette/spin',
        sender_addr: `${req.body.senderAddr}`,
        sender_bets: `${req.body.bets}`,
    });

    /*
    bets = [
      // Red/Black
      {
        r4: 0,
        r5: 0 (red) or 1 (black),
        multiplier: 1,
      },
      // Odd/Even
      {
        r4: 1,
        r5: 0 (even) or 1 (odd),
        multiplier: 1,
      },
      // Lower Half/Upper Half
      {
        r4: 2,
        r5: 10 (1-18) or 28 (19-36),
        multiplier: 1,
      },
      // Columns
      {
        r4: 3,
        r5: 1 (1st column) or 2 (2nd column) or 3 (3rd column),
        multiplier: 2,
      },
      // Lower third/ Mid third/ Upper third
      {
        r4: 4,
        r5: 6 (1-12) or 18 (13-24) or 30 (25-36),
        multiplier: 2,
      },
      // Exact Number
      {
        r4: 5,
        r5: 0...36,
        multiplier: 35,
      }
      ...
    ]
    */

    profiler.done({
      hostname: `${rouletteLogger.defaultMeta.hostname}`,
      request_id: `${uuid}`,
      tx_id: `abcdef`,
      code: 200
    })
  
    res.status(200).json("Spinner is broken, come back later")

  }
}