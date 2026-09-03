import { app } from "./app.js"

const server = app.listen(8080, () => {
    console.log("Server is running on port 8080")
})

const shutdown = (signal: string) => {
    console.log("Server is shutting down")
    server.close(() => {
        console.log(`Server has been closed on ${signal}`)
        process.exit(0)
    })
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))