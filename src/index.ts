import app from "./server"
import dotenv from "dotenv"
//import LeaderboardDAO from "./dao/leaderboardDAO"

//const MongoClient = require('mongodb').MongoClient;

dotenv.config()
const port = process.env.PORT || 8000

//const work = async () => {
//   return new Promise(resolve => setTimeout(resolve, 2000));
//}

//async function startClock() {
//    for (;;) {
//        await work()
//        console.log("Hello")
//    }
//}

/**MongoClient.connect(
    process.env.CASINO_DB_URI,
    {
        maxPoolSize: 50,
        wtimeoutMS: 2500,
        useNewUrlParser: true
    })
    .catch((err: { stack: any; }) => {
        console.error("Error while connecting to mongodb - " + err.stack)
        process.exit(1)
    })
    .then(async (client: any) => {
        await LeaderboardDAO.injectDB(client)
        app.listen(port, () => {
            console.log(`listening on port ${port}`)
        })
    })*/
//await startClock()

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
