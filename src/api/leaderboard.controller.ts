import LeaderboardDAO from "../dao/leaderboardDAO"
import { Request, Response } from "express"

export default class LeaderboardController {
    static async apiGetLeaderboard(req: Request, res: Response): Promise<void> {

        let { leaderboardList } = await LeaderboardDAO.getLeaderboard()
        res.status(200).json(leaderboardList)
    }
}