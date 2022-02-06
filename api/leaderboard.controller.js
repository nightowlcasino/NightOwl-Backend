import LeaderboardDAO from "../dao/leaderboardDAO.js"

export default class LeaderboardController {
    static async apiGetLeaderboard(req, res, next) {

        let { leaderboardList } = await LeaderboardDAO.getLeaderboard()
        
        res.json(leaderboardList)
    }
}