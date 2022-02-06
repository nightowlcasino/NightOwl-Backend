let leaderboard

export default class LeaderboardDAO {
    static async injectDB(conn) {
        if (leaderboard) {
            return
        }
        try {
            leaderboard = await conn.db(process.env.RESTREVIEWS_NS).collection("leaderboard")
        } catch (e) {
            console.error(
                `unable to establish a collection handle in leaderboardDAO: ${e}`,
            )
        }
    }

    static async getLeaderboard() {
        let cursor

        try {
            cursor = await leaderboard
              .find()
        } catch (e) {
            console.error(`Unable to issue find command, ${e}`)
            return {}
        }

        try {
            const leaderboardList = await cursor.toArray()

            return { leaderboardList }
        } catch(e) {
            console.error(
                `Unable to convert cursor to array, ${e}`,
            )
            return {}
        }
    }
}