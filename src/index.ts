import app from "./server"
import dotenv from "dotenv"
import logger from "./logger"

dotenv.config()
const port = process.env.PORT || 8088
const host = process.env.HOST || "0.0.0.0"

app.listen(Number(port), host, () => {
    logger.info(`listening on port ${port}`)
})
